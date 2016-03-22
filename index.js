var fs = require('graceful-fs');
var path = require('path');
var mkdirp = require('mkdirp');
var textract = require('textract');
var DirectoryStructureJSON = require('directory-structure-json');
var zlib = require('zlib');
var tar = require('tar');
var fstream = require('fstream');
var rimraf = require('rimraf');

// module functions
function decompressFilesFromPath (zippedDir, outputDir, callback) {
    unpackFolder(zippedDir, function (err, inputDir) {
        if (err) return callback(err);

        DirectoryStructureJSON.getStructure(inputDir, function (err, structure, total) {
            if (err) return callback(err);

            var filesRemaining = total.files;

            DirectoryStructureJSON.traverseStructure(structure, inputDir,
            function (folder, location) {},
            function (file, location) {
                var extension = path.extname(file.name);

                if (extension !== '.gz') {
                    --filesRemaining;
                    if (!filesRemaining) callback();
                    return;
                }

                var oldFilepath = location + '/' + file.name;
                var newFilePath = oldFilepath.replace(inputDir, outputDir);
                var newDir = path.dirname(newFilePath);

                createFolders(newDir, function (err) {
                    if (err) return callback(err);

                    copyFile(oldFilepath, newFilePath, function (err) {
                        if (err) return callback(err);

                        decompressFile(newFilePath, true, function () {
                            --filesRemaining;
                            if (!filesRemaining) {
                                rimraf(inputDir, fs, function (err) {
                                    if (err) return callback(err);
                                    return callback();
                                });
                            }
                        });
                    });
                });
            });
        });
    });
}

function compressFilesToPath (inputDir, outputDir, saveAs, allowedExtensions, callback) {
    DirectoryStructureJSON.getStructure(inputDir, function (err, structure, total) {
        if (err) return callback(err);

        var filesRemaining = total.files;

        DirectoryStructureJSON.traverseStructure(structure, inputDir,
        function (folder, location) {},
        function (file, location) {
            var extension = path.extname(file.name);

            if (allowedExtensions.indexOf(extension) < 0) {
                --filesRemaining;
                if (!filesRemaining) callback();
                return;
            }

            var oldFilepath = location + '/' + file.name;
            var newFilePath = oldFilepath;

            if (extension) {
                newFilePath = newFilePath.substring(0, newFilePath.indexOf(extension)).replace(inputDir, outputDir) + saveAs;
            } else {
                newFilePath = newFilePath.replace(inputDir, outputDir) + saveAs;
            }

            var newDir = path.dirname(newFilePath);

            createFolders(newDir, function (err) {
                if (err) return callback(err);

                // handle plain text files
                if (!extension && saveAs) {
                    return fs.readFile(oldFilepath, 'utf-8', function (err, text) {
                        if (err) return callback(err);

                        fs.writeFile(newFilePath, text, function (err) {
                            if (err) return callback(err);

                            compressFile(newFilePath, true, function () {
                                --filesRemaining;

                                if (!filesRemaining) {
                                    packFolder(outputDir, function (err) {
                                        if (err) return callback(err);

                                        rimraf(outputDir, fs, function (err) {
                                            if (err) return callback(err);
                                            return callback(); 
                                        });
                                    });
                                }
                            });
                        });
                    });
                }

                // handle other formats
                textract.fromFileWithPath(oldFilepath, function (err, text) {
                    if (err) return callback(err);

                    fs.writeFile(newFilePath, text, function (err) {
                        if (err) return callback(err);
                        compressFile(newFilePath, true, function () {
                            --filesRemaining;
                            if (!filesRemaining) {
                                packFolder(outputDir, function (err) {
                                    if (err) return callback(err);

                                    rimraf(outputDir, fs, function (err) {
                                        if (err) return callback(err);
                                        return callback(); 
                                    });
                                });
                            }
                        });
                    });
                });
            });
        });
    });
}

// helper functions
function compressFile (filePath, deleteOriginal, callback) {
    var gzip = zlib.createGzip({
        level: 9,
        memLevel: 9
    });
    var inp = fs.createReadStream(filePath);
    var out = fs.createWriteStream(filePath + '.gz');
    var stream = inp.pipe(gzip).pipe(out);

    stream.on('finish', function () {
        if (deleteOriginal === true) fs.unlink(filePath);
        callback(); 
    });
}

function decompressFile (filePath, deleteOriginal, callback) {
    var unzip = zlib.createUnzip();
    var inp = fs.createReadStream(filePath);
    var out = fs.createWriteStream(filePath.replace('.gz', ''));
    var stream = inp.pipe(unzip).pipe(out);

    stream.on('finish', function () {
        if (deleteOriginal === true) fs.unlink(filePath);
        callback();
    });
}

function createFolders (dir, callback) {
    fs.access(dir, fs.F_OK, (err) => {
        if (!err) return callback();;

        mkdirp(dir, function (err) {
            callback(err);
        });
    });
}

function copyFile (source, target, callback) {
    var callbackCalled = false;

    var readStream = fs.createReadStream(source);
    readStream.on('error', function (err) {
        done(err);
    });

    var writeStream = fs.createWriteStream(target);
    writeStream.on('error', function (err) {
        done(err);
    });
    writeStream.on('close', function (ex) {
        done();
    });

    readStream.pipe(writeStream);

    function done(err) {
        if (!callbackCalled) {
            callback(err);
            callbackCalled = true;
        }
    }
}

function packFolder (inputDir, callback) {
    var packer = tar.Pack({ noProprietary: true })
    .on('error', function (err) {
        return callback(err);
    })
    .on('end', function () {
        compressFile(inputDir + '.tar', true, function () {
            return callback(null, inputDir + '.tar.gz');
        });
    });

    fstream.Reader({ path: inputDir, type: "Directory" })
    .on('error', function (err) {
        return callback(err);
    })
    .pipe(packer)
    .pipe(fs.createWriteStream(inputDir + '.tar'))
}

function unpackFolder (zippedDir, callback) {
    decompressFile(zippedDir, false, function () {
        var extractor = tar.Extract({path: path.dirname(zippedDir)})
        .on('error', function (err) {
            return callback(err);
        })
        .on('end', function () {
            fs.unlink(zippedDir.replace('.gz', ''), function () {
                return callback(null, zippedDir.replace('.tar.gz', ''));
            });
        });

        fs.createReadStream(zippedDir.replace('.gz', ''))
        .on('error', function (err) {
            return callback(err);
        })
        .pipe(extractor);
    });
}

module.exports.decompressFilesFromPath = decompressFilesFromPath;
module.exports.compressFilesToPath = compressFilesToPath;

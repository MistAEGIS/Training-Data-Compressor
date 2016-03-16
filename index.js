var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var textract = require('textract');
var DirectoryStructureJSON = require('directory-structure-json');
var zlib = require('zlib');

function compressFile (filePath, deleteOriginal, callback) {
    var gzip = zlib.createGzip();
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

function decompressFilesFromPath (inputDir, callback) {
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

            var filePath = location + '/' + file.name;
            decompressFile(filePath, true, function () {
                --filesRemaining;
                if (!filesRemaining) return callback();
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
            var newFilePath = oldFilepath.substring(0, oldFilepath.indexOf(extension)).replace(inputDir, outputDir) + saveAs;
            var newDir = path.dirname(newFilePath);

            createFolders(newDir, function (err) {
                if (err) return callback(err);

                if (!extension && saveAs) {
                    return fs.readFile(oldFilepath, 'utf-8', function (err, text) {
                        if (err) return callback(err);

                        fs.writeFile(newFilePath, text, function (err) {
                            if (err) return callback(err);
                            compressFile(newFilePath, true, function () {
                                --filesRemaining;
                                if (!filesRemaining) return callback();
                            });
                        });
                    });
                }

                textract.fromFileWithPath(oldFilepath, function (err, text) {
                    if (err) return callback(err);

                    fs.writeFile(newFilePath, text, function (err) {
                        if (err) return callback(err);
                        compressFile(newFilePath, true, function () {
                            --filesRemaining;
                            if (!filesRemaining) return callback();
                        });
                    });
                });
            });
        });
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

module.exports.decompressFilesFromPath = decompressFilesFromPath;
module.exports.compressFilesToPath = compressFilesToPath;

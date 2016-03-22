Training Data Compressor
========================

This module will compress/decompress documents in a folder by extracting their text and gzipping them all individually. Afterwards the folder is tarred. The module exposes functions with which you can:

* Compress documents (`pdf`, `docx`, etc.) by extracting the raw text of them and gzipping them.
* Decompress the same gzipped raw text documents, so they can be used by your machine learning algorithm

## Installation
    npm install --save training-data-compressor

## Motive
Training data can take up alot of space, especially if your data depends on Word and PDF files.
If you only need the raw text from these documents to train and not the styling/markup, you can preprocess your documents.
By preprocessing these files through compression and text extraction, you can save alot of space.

## Formats that can be extracted and compressed
This module uses [textract](https://github.com/dbashford/textract) under the hood, and therefore can only compress files that textract supports.
View [this link](https://github.com/dbashford/textract#currently-extracts) to see which formats you can use.
Also note that certain filetypes have [certain requirements](https://github.com/dbashford/textract#extraction-requirements) that need to be installed on the computer. 


## Compress documents in folder
This will extract the contents of documents and compresses them into `.gz` files.
The `outputDir` will be tarred.

``` javascript
var TrainingDataCompressor = require('training-data-compressor');
var inputDir = './training-data';
var outputDir = './training-data-compressed';
var saveFilesAs = '.txt';
var filesToCompress = ['.docx', '.pdf'];

TrainingDataCompressor.compressFilesToPath(inputDir, outputDir, saveFilesAs, filesToCompress, function (err) {
    if (err) console.log(err);

    console.log('done compressing files, files are compressed at: ', outputDir + '.tar');
});
```

## Decompress documents in folder
The files that have been compressed, as seen in the example above, can also be decompressed.

``` javascript
var TrainingDataCompressor = require('training-data-compressor');
var tarredDir = './training-data-compressed.tar';
var outputDir = './training-data-decompressed';

TrainingDataCompressor.decompressFilesFromPath(tarredDir, outputDir, function (err) {
    if (err) console.log(err);

    console.log('done decompressing files at: ', outputDir);
});
```

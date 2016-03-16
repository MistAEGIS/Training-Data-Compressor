Training Data Compressor
========================

This module exposes functions with which you can:

* Compress documents (`pdf`, `docx`, etc.) by extracting the raw text of them and gzipping them.
* Decompress the same gzipped raw text documents, so they can be used by your machine learning algorithm

## Installation
    npm install --save training-data-compressor

## Motive
Training data can take up alot of space, especially if your data depends on Word and PDF files.
By preprocessing these files through compression and text extraction, you can solve this issue.

## Formats that can be extracted and compressed
This module uses [textract](https://github.com/dbashford/textract) under the hood, and therefore can only compress files that textract supports.
View [this link](https://github.com/dbashford/textract#currently-extracts) to see which formats you can use.
Also note that certain filetypes have [certain requirements](https://github.com/dbashford/textract#extraction-requirements) that need to be installed on the computer. 


## Compress documents in folder
This will extract the contents of documents and compresses them into `.gz` files.

``` javascript
var TrainingDataCompressor = require('training-data-compressor');
var inputDir = './training-data';
var outputDir = './training-data-compressed';
var saveFilesAs = '.txt';
var filesToCompress = ['.docx', '.pdf'];

compressFilesToPath(inputDir, outputDir, saveFilesAs, filesToCompress, function (err) {
    if (err) console.log(err);

    console.log('done compressing files');
});
```

## Decompress documents in folder
The files that have been compressed, as seen in the example above, can also be decompressed.

``` javascript
var TrainingDataCompressor = require('training-data-compressor');
var inputDir = './training-data-compressed';

TrainingDataCompressor.decompressFilesFromPath(inputDir, function (err) {
    if (err) console.log(err);

    console.log('done decompressing files');
});
```

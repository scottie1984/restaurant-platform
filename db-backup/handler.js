'use strict';

const AWS = require('aws-sdk');
const fs = require('fs');
const dayjs = require('dayjs');
const ZipFolder = require('zip-a-folder');
const exec = require('child_process').exec;

// ENVIRONMENT VARIABLES
// Mongo
const dbName = 'restaurants_platform';

// S3
const bucketName = process.env.S3_BUCKET;
const storageClass = process.env.S3_STORAGE_CLASS || "STANDARD";
const s3bucket = new AWS.S3({ params: { Bucket: bucketName, StorageClass: storageClass } });

const dateFormat = process.env.DATE_FORMAT || 'YYYYMMDD_HHmmss';

module.exports.run = function(event, context, cb) {

  const MONGO_CONN = process.env.MONGO_CONN_STR + dbName + '?' + process.env.MONGO_QRY

  console.log(`Backup of database '${dbName}' to S3 bucket '${bucketName}' is starting`);
  process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];
  let fileName = dbName + '_' + dayjs().format(dateFormat);
  let folderName = `/tmp/${fileName}/`;
  let filePath = `/tmp/${fileName}.zip`;

  exec(`mongodump --uri="${MONGO_CONN}" -o ${folderName}`, (error, stdout, stderr) => {

      if (error) {
        console.log('Mongodump failed: ' + error);
        return;
      }

      ZipFolder.zipFolder(folderName, filePath, function(err) {
        if (err) {
          console.log('ZIP failed: ', err);
        } else {
          fs.readFile(filePath, function(err, data) {
            s3bucket.upload({ Key: fileName + '.zip', Body: data, ContentType: 'application/zip' }, function(err, data) {
              fs.unlink(filePath, function(err) {
                if (err) {
                  console.log('Could not delete temp file: ' + err);
                }
              });
              if (err) {
                console.log('Upload to S3 failed: ' + err);
              } else {
                console.log('Backup completed successfully');
              }
            });
          });
        }
      });

    });

};
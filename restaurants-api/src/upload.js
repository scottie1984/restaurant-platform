'use strict'
const s3 = require('s3')
const shortid = require('shortid')

const client = s3.createClient({})

function uploadToS3 (id, file) {
  return new Promise((resolve, reject) => {
    const uploadKey = shortid.generate()
    const params = {
      localFile: file.path,

      s3Params: {
        Bucket: 'loql-images',
        Key: id + '/' + uploadKey
      }
    }
    const uploader = client.uploadFile(params)
    uploader.on('error', function (err) {
      console.error('unable to upload:', err.stack)
      reject(err)
    })
    uploader.on('end', function () {
      console.log('Finished')
      resolve({ id: uploadKey })
    })
  })
}

module.exports = {
  uploadToS3
}

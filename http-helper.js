const http = require('http');
const https = require('https');

/**
 * getJSON:  REST get request returning JSON object(s)
 * @param options: http options object
 */
exports.getJSON = function (options, data) {
    console.log('rest::getJSON');

    const reqHandler = options.port === 443 ? https : http;

    let postData

    if (data){
        postData = Buffer.isBuffer(data) ? data : JSON.stringify(data)
        options.headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }

    return new Promise((resolve, reject) => {
        const req = reqHandler.request(options, (res) => {
            let output = '';
            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                output += chunk;
            });

            res.on('end', () => {
                if (res.statusCode !== 200)
                    return reject(output)

                try {
                    const obj = JSON.parse(output);
                    resolve(obj )
                }
                catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', (err) => {
            console.error('rest::request', err);
            reject(err);
        });

        if (data) req.write(postData);
        req.end();
    });
};


const crypto = require('crypto');

function base64Url(str) {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function sha256(data) {
    const hash = crypto.createHash('sha256').update(data).digest('base64');
    return base64Url(hash);
}

function hmacSha512(key, data) {
    const hmac = crypto.createHmac('sha512', key);
    hmac.update(data);
    return base64Url(hmac.digest('base64'));
}

function processParams(params) {
    if (!params || Object.keys(params).length === 0) return '';
    
    // Sort keys
    const sortedKeys = Object.keys(params).sort((a, b) => {
        const ea = encodeURIComponent(a);
        const eb = encodeURIComponent(b);
        return ea < eb ? -1 : ea > eb ? 1 : 0;
    });

    const usp = new URLSearchParams();
    
    sortedKeys.forEach(key => {
        let values = params[key];
        if (!Array.isArray(values)) {
            values = [values];
        }
        // Sort values
        values.sort((a, b) => {
            const ea = encodeURIComponent(a);
            const eb = encodeURIComponent(b);
            return ea < eb ? -1 : ea > eb ? 1 : 0;
        });
        
        values.forEach(val => {
            usp.append(key.toLowerCase(), val);
        });
    });

    let str = usp.toString();
    // Replacements from cf function
    str = str.replace(/:/g, "%3A")
             .replace(/%20/g, "+")
             .replace(/ /g, "+") // URLSearchParams already encodes spaces as +, but just to be sure matching JS logic
             .replace(/\(/g, "%28")
             .replace(/\)/g, "%29")
             .replace(/'/g, "%27")
             .replace(/,/g, "%2C")
             .replace(/;/g, "%3B");
             
    return str;
}

function generateSignature(path, body, params, profileLogin, passwordHash, timestamp) {
    // 1. Hash Body
    let bodyHash = '';
    if (body) {
        const bodyStr = JSON.stringify(body);
        bodyHash = sha256(bodyStr);
    }

    // 2. Hash Params
    let paramsHash = '';
    const processedParams = processParams(params);
    if (processedParams) {
        paramsHash = sha256(processedParams);
    }

    // 3. Construct Payload
    // `${path}_${timestamp}_${profileLogin}_${bodyHash}_${paramsHash}`
    // Note: JS code uses mf(i,n,e,s,l) -> i=path, n=timestamp, e=profileLogin, s=bodyHash, l=paramsHash
    // mf returns `${i}_${t}_${o}_${e}_${r}` -> path_timestamp_profileLogin_bodyHash_paramsHash
    // variable mapping in JS: p = mf(i,n,e,s,l) so order is correct.
    
    const payload = `${path}_${timestamp}_${profileLogin}_${bodyHash}_${paramsHash}`;
    
    // 4. Sign
    return hmacSha512(passwordHash, payload);
}


function getHeaders(deviceId, now = null) {
    const timestamp = now || Math.floor(Date.now() / 1000).toString();
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0',
        'Content-Type': 'application/json',
        'X-jd-param-app-platform': 'web',
        'X-jd-param-app-version': '1.0.0',
        'X-jd-param-locale': 'en',
        'X-jd-security-version': '4',
        'X-jd-ticket-system-version': '28',
        'Accept': 'application/json',
        'X-jd-param-user-device-id': deviceId,
        'X-jd-timestamp': timestamp
    };
}

module.exports = {
    getHeaders,
    generateSignature
};


const config = require('./config');

module.exports = { httpLogger, sqlLogger, apiLogger };

function httpLogger(req, res, resBody) {
    const logData = {
        authorized: !!req.headers.authorization,
        path: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        reqBody: JSON.stringify(req.body),
        resBody: JSON.stringify(resBody),
    };

    const level = statusToLogLevel(res.statusCode);
    log(level, 'http', logData);
};

function sqlLogger(query) {
    const logData = query;
    this.log('info', 'sql', logData);
};

function apiLogger(call) {
    const logData = { call: call };
    this.log('info', 'api', logData);
}

//util

function log(level, type, logData) {
    const labels = { component: config.logger.source, level: level, type: type };
    const values = [nowString(), sanitize(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    sendLogToGrafana(logEvent);
}

function statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
}

function nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
}

function sanitize(logData) {
    logData = JSON.stringify(logData);
    //remove passwords
    logData = logData.replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\": \\"*****\\"');
    //remove auth tokens
    logData = logData.replace(/\\"authorization\\":\s*\\"[^"]*\\"/g, '\\"authorization\\": \\"*****\\"');
    logData = logData.replace(/\\"authorized\\":\s*\\"[^"]*\\"/g, '\\"authorized\\": \\"*****\\"');
    return logData;
}

function sendLogToGrafana(event) {
    const body = JSON.stringify(event);
    fetch(`${config.logger.url}`, {
        method: 'post',
        body: body,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.logger.userId}:${config.logger.apiKey}`,
        },
    }).then((res) => {
        if (!res.ok) console.log('Failed to send log to Grafana');
    });
}
const config = require('./config.js');

class Logger {
    httpLogger = (req, res, next) => {
        let send = res.send;
        res.send = (resBody) => {
            const logData = {
                authorized: !!req.headers.authorization,
                path: req.originalUrl,
                method: req.method,
                statusCode: res.statusCode,
                reqBody: JSON.stringify(req.body),
                resBody: JSON.stringify(resBody),
            };
            const level = this.statusToLogLevel(res.statusCode);
            this.log(level, 'http', logData);
            res.send = send;
            return res.send(resBody);
        };
        next();
    };

    sqlLogger = (query) => {
        const logData = { query: query };
        this.log('info', 'sql', logData);
    };

    apiLogger = (apiCall) => {
        const logData = { apiCall: apiCall };
        this.log('info', 'api', logData);
    };

    // exceptionLogger = (err, req, res, next) => {
    //     const logData = {};
    //     logData.path = req.originalUrl;
    //     logData.method = req.method;
    //     logData.reqBody = JSON.stringify(req.body);
    //     logData.err = err.stack;
    //     this.log('error', 'exception', logData);
    //     next(err);
    // };

    log(level, type, logData) {
        const labels = { component: config.logger.source, level: level, type: type };
        const values = [this.nowString(), this.sanitize(logData)];
        const logEvent = { streams: [{ stream: labels, values: [values] }] };

        this.sendLogToGrafana(logEvent);
    }

    statusToLogLevel(statusCode) {
        if (statusCode >= 500) return 'error';
        if (statusCode >= 400) return 'warn';
        return 'info';
    }

    nowString() {
        return (Math.floor(Date.now()) * 1000000).toString();
    }

    sanitize(logData) {
        logData = JSON.stringify(logData);
        logData = logData.replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\": \\"*****\\"');
        logData = logData.replace(/\\"Authorization\\":\s*\\"Bearer\s*[^"]*\\"/g, '\\"Authorization\\": \\"Bearer *****\\"');
        return logData;
    }

    sendLogToGrafana(event) {
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
}
module.exports = new Logger();
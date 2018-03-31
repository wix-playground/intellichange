'use strict';

const LOGGING_ENABLED = false;
function log(...args: any[]) {
    if (LOGGING_ENABLED) {
        console.log(...args);
    }
};

export default log;

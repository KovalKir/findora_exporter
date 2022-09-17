'use strict'

const dotenv = require('dotenv');
const client = require('prom-client');
const axios = require ('axios').default;

dotenv.config();

const requestInterval = process.env.INTERVAL;
const url = process.env.EXPLORER_URL;


function setExplorerMetrics (registry) {
    
    const balance = new client.Gauge ({
        name: 'self_delegation_FRA',
        help: 'Validator Self Delegation (FRA)',
        registers: [registry],
        labelNames: ['method'],
    });

    const stake = new client.Gauge ({
        name: 'validator_voting_power',
        help: 'Total Stake (FRA)',
        registers: [registry],
        labelNames: ['method'],
    });

    const status = new client.Gauge({
        name: 'validator_status',
        help: 'Validator Online Status (1 = online, 0 = offline)',
        registers: [registry],
        labelNames: ['method'],
    });

    function setMetrics () {
        axios.get(url).then ( (response) => {
        
            balance.labels({method: 'GET'}).set(response.data.data.self_staking/1000000);
            stake.labels({method: 'GET'}).set(response.data.data.voting_power/1000000);
            response.data.data.is_online === true ? status.labels({method: 'GET'}).set(1) : status.labels({method: 'GET'}).set(0);
    
        }).catch ( (error) => {
            balance.labels({method:'GET'});
            stake.labels({method:'GET'});
            status.labels({method:'GET'});

            console.error(error);
        });

    }

    setInterval(setMetrics, requestInterval);

}


function checkSyncNode (registry) {
    
    const gauge = new client.Gauge({
        name: 'validator_sync_status',
        help: 'Validator Sync Status (1 = synced, 0 = catching up)',
        registers: [registry],
        labelNames: ['method'],
    });
    
    function checkSync () {
        axios.get('http://127.0.0.1:26657/status').then ( (response) => {
            const isSynced = response.data.result.sync_info.catching_up;
            isSynced === true ? gauge.labels({method: 'GET'}).set(0) :  gauge.labels({method: 'GET'}).set(1);
        }).catch( (error) => {
            gauge.labels({method: 'GET'});
            console.error(error);
        });

    }

    setInterval(checkSync,requestInterval);

}

module.exports = (registry) => {
    setExplorerMetrics(registry);
    checkSyncNode(registry);
};

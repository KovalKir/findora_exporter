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
    });

    const stake = new client.Gauge ({
        name: 'validator_voting_power',
        help: 'Total Stake (FRA)',
        registers: [registry],
    });

    const status = new client.Gauge({
        name: 'validator_status',
        help: 'Validator Online Status (1 = online, 0 = offline)',
        registers: [registry],
    });

    function setMetrics () {
        axios.get(url).then ( (response) => {
        
            balance.set(response.data.self_staking/1000000);
            stake.set(response.data.voting_power/1000000);
            response.data.is_online === true ? status.set(1) : status.set(0);
    
        }).catch ( (error) => {
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
    });
    
    function checkSync () {
        axios.get('http://127.0.0.1:26657/status').then ( (response) => {
            const isSynced = response.data.result.sync_info.catching_up;
            isSynced === true ? gauge.set(0) : gauge.set(1);
        }).catch( (error) => {
            console.error(error);
        });

    }

    setInterval(checkSync,requestInterval);

}

module.exports = (registry) => {
    setExplorerMetrics(registry);
    checkSyncNode(registry);
};

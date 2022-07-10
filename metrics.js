'use strict'

const client = require('prom-client');

const { exec } = require('child_process');

const axios = require ('axios').default;

const requestInterval = 60000; //ms

const statusFn = '"is_online":';
const balanceFn = '"bond":';
const stakeFn = '"voting_power":';
const rewardsFn = '"rewards":';

async function checkNumericMetric (expr, gauge) {
    exec(`/usr/local/bin/fn show | grep -w '${expr}' | sed 's/.$//' | sed 's/^.*: //'`, 
    (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }

        let result = Number(stdout) / 1000000;
        gauge.set(result);
    })

}

function setNumericMetrics (registry) {
    
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

    const rewards = new client.Gauge({
        name: 'validator_rewards',
        help: 'Avaliable Rewards (FRA)',
        registers: [registry],
    });

    setInterval(async () => await checkNumericMetric(balanceFn, balance), requestInterval);
    setInterval(async () => await checkNumericMetric(stakeFn,stake), requestInterval);
    setInterval(async () => await checkNumericMetric(rewardsFn, rewards), requestInterval);

}

function checkValidatorStatus (registry) {
    const gauge = new client.Gauge({
        name: 'validator_status',
        help: 'Validator Online Status (1 = online, 0 = offline)',
        registers: [registry],
    });

    function checkStatus () { 
        exec(`/usr/local/bin/fn show | grep -w "is_online" | sed 's/.$//' | sed 's/^.*: //'`, 
            async (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    return;
                }

                let status = String (stdout);

                status = status.trim();
                
                status == 'true' ? status = 1 : status = 0;
                gauge.set(status);

            })
    }
    
    setInterval(checkStatus, requestInterval);

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
    setNumericMetrics(registry);
    checkValidatorStatus(registry);
    checkSyncNode(registry);
};

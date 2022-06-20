'use strict'

const client = require('prom-client');

const { exec } = require('child_process');


const statusFn = '"is_online":';
const balanceFn = '"bond":';
const stakeFn = '"voting_power":';
const rewardsFn = '"rewards":';

function checkNumericMetric (expr, gauge) {
    exec(`/usr/local/bin/fn show | grep -w '${expr}' | sed 's/.$//' | sed 's/^.*: //'`, 
    async (error, stdout, stderr) => {
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

    setInterval(checkNumericMetric(balanceFn, balance), 5000);
    setInterval(checkNumericMetric(stakeFn,stake), 5000);
    setInterval(checkNumericMetric(rewardsFn, rewards), 5000);

}

module.exports = (registry) => {
    setNumericMetrics(registry);
};

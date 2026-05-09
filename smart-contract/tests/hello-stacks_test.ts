import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Ensure that greeting can be read",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('hello-stacks', 'get-greeting', [], deployer.address)
        ]);
        
        block.receipts[0].result.expectOk().expectUtf8('Hello, Stacks!');
    },
});

Clarinet.test({
    name: "Ensure that only owner can set greeting",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('hello-stacks', 'set-greeting', 
                [types.utf8('New greeting')], wallet1.address)
        ]);
        
        block.receipts[0].result.expectErr().expectUint(100);
        
        let block2 = chain.mineBlock([
            Tx.contractCall('hello-stacks', 'set-greeting', 
                [types.utf8('New greeting')], deployer.address)
        ]);
        
        block2.receipts[0].result.expectOk();
    },
});

Clarinet.test({
    name: "Users can save and retrieve messages",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('hello-stacks', 'save-message', 
                [types.utf8('My test message')], wallet1.address),
            Tx.contractCall('hello-stacks', 'get-message', 
                [types.principal(wallet1.address)], wallet1.address)
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectSome().expectUtf8('My test message');
    },
});

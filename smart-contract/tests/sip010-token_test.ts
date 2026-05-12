import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Token has correct metadata",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('sip010-token', 'get-name', [], deployer.address),
            Tx.contractCall('sip010-token', 'get-symbol', [], deployer.address),
            Tx.contractCall('sip010-token', 'get-decimals', [], deployer.address),
        ]);
        
        block.receipts[0].result.expectOk().expectUtf8('Stack Token');
        block.receipts[1].result.expectOk().expectUtf8('STK');
        block.receipts[2].result.expectOk().expectUint(6);
    },
});

Clarinet.test({
    name: "Deployer receives initial supply",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('sip010-token', 'get-balance', 
                [types.principal(deployer.address)], deployer.address),
            Tx.contractCall('sip010-token', 'get-total-supply', [], deployer.address),
        ]);
        
        block.receipts[0].result.expectOk().expectUint(1000000000);
        block.receipts[1].result.expectOk().expectUint(1000000000);
    },
});

Clarinet.test({
    name: "Users can transfer tokens",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('sip010-token', 'transfer', 
                [types.uint(1000), types.principal(deployer.address), 
                 types.principal(wallet1.address), types.none()], 
                deployer.address),
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        let block2 = chain.mineBlock([
            Tx.contractCall('sip010-token', 'get-balance', 
                [types.principal(wallet1.address)], wallet1.address),
        ]);
        
        block2.receipts[0].result.expectOk().expectUint(1000);
    },
});

Clarinet.test({
    name: "Only token owner can transfer their tokens",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('sip010-token', 'transfer', 
                [types.uint(1000), types.principal(deployer.address), 
                 types.principal(wallet2.address), types.none()], 
                wallet1.address),
        ]);
        
        block.receipts[0].result.expectErr().expectUint(101);
    },
});

Clarinet.test({
    name: "Only contract owner can mint tokens",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('sip010-token', 'mint', 
                [types.uint(5000), types.principal(wallet1.address)], 
                wallet1.address),
        ]);
        
        block.receipts[0].result.expectErr().expectUint(100);
        
        let block2 = chain.mineBlock([
            Tx.contractCall('sip010-token', 'mint', 
                [types.uint(5000), types.principal(wallet1.address)], 
                deployer.address),
        ]);
        
        block2.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Users can burn their tokens",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('sip010-token', 'burn', 
                [types.uint(1000)], deployer.address),
            Tx.contractCall('sip010-token', 'get-total-supply', [], deployer.address),
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectUint(999999000);
    },
});

import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can create a new wallet",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'create-wallet', 
                [types.utf8('My Org'), types.utf8('Organization wallet'), types.uint(2)], 
                deployer.address)
        ]);
        
        block.receipts[0].result.expectOk().expectUint(0);
        
        // Verify wallet was created
        let block2 = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'get-wallet', [types.uint(0)], deployer.address)
        ]);
        
        const wallet = block2.receipts[0].result.expectOk().expectSome();
        assertEquals(wallet['name'], 'My Org');
    },
});

Clarinet.test({
    name: "Creator is automatically added as owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'create-wallet', 
                [types.utf8('Test Wallet'), types.utf8('Test'), types.uint(1)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'get-member', 
                [types.uint(0), types.principal(deployer.address)], 
                deployer.address)
        ]);
        
        block.receipts[0].result.expectOk();
        const member = block.receipts[1].result.expectOk().expectSome();
        assertEquals(member['role'], types.uint(1)); // role-owner
        assertEquals(member['active'], types.bool(true));
    },
});

Clarinet.test({
    name: "Owner can add members with different roles",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'create-wallet', 
                [types.utf8('Test'), types.utf8('Test'), types.uint(2)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'add-member', 
                [types.uint(0), types.principal(wallet1.address), types.uint(2), types.uint(1000)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'add-member', 
                [types.uint(0), types.principal(wallet2.address), types.uint(3), types.uint(500)], 
                deployer.address)
        ]);
        
        block.receipts[0].result.expectOk();
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Non-owner cannot add members",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'create-wallet', 
                [types.utf8('Test'), types.utf8('Test'), types.uint(2)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'add-member', 
                [types.uint(0), types.principal(wallet2.address), types.uint(3), types.uint(500)], 
                wallet1.address)
        ]);
        
        block.receipts[0].result.expectOk();
        block.receipts[1].result.expectErr().expectUint(102); // err-unauthorized
    },
});

Clarinet.test({
    name: "Owner can remove members",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'create-wallet', 
                [types.utf8('Test'), types.utf8('Test'), types.uint(2)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'add-member', 
                [types.uint(0), types.principal(wallet1.address), types.uint(3), types.uint(500)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'remove-member', 
                [types.uint(0), types.principal(wallet1.address)], 
                deployer.address)
        ]);
        
        block.receipts[2].result.expectOk().expectBool(true);
        
        // Verify member is inactive
        let block2 = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'is-member-active', 
                [types.uint(0), types.principal(wallet1.address)], 
                deployer.address)
        ]);
        
        block2.receipts[0].result.expectOk().expectBool(false);
    },
});

Clarinet.test({
    name: "Members can create proposals",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'create-wallet', 
                [types.utf8('Test'), types.utf8('Test'), types.uint(2)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'add-member', 
                [types.uint(0), types.principal(wallet1.address), types.uint(3), types.uint(1000)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'create-proposal', 
                [types.uint(0), types.principal(wallet2.address), types.uint(500), 
                 types.principal(deployer.address), types.utf8('Payment'), types.uint(144)], 
                wallet1.address)
        ]);
        
        block.receipts[2].result.expectOk().expectUint(0);
    },
});

Clarinet.test({
    name: "Proposal respects spending limits",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'create-wallet', 
                [types.utf8('Test'), types.utf8('Test'), types.uint(2)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'add-member', 
                [types.uint(0), types.principal(wallet1.address), types.uint(3), types.uint(500)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'create-proposal', 
                [types.uint(0), types.principal(wallet2.address), types.uint(1000), 
                 types.principal(deployer.address), types.utf8('Payment'), types.uint(144)], 
                wallet1.address)
        ]);
        
        block.receipts[2].result.expectErr().expectUint(110); // err-spending-limit-exceeded
    },
});

Clarinet.test({
    name: "Members can approve proposals",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'create-wallet', 
                [types.utf8('Test'), types.utf8('Test'), types.uint(2)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'add-member', 
                [types.uint(0), types.principal(wallet1.address), types.uint(3), types.uint(1000)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'create-proposal', 
                [types.uint(0), types.principal(wallet2.address), types.uint(500), 
                 types.principal(deployer.address), types.utf8('Payment'), types.uint(144)], 
                wallet1.address),
            Tx.contractCall('stack-wallet', 'approve-proposal', 
                [types.uint(0)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'approve-proposal', 
                [types.uint(0)], 
                wallet1.address)
        ]);
        
        block.receipts[3].result.expectOk().expectBool(true);
        block.receipts[4].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Cannot vote twice on same proposal",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'create-wallet', 
                [types.utf8('Test'), types.utf8('Test'), types.uint(2)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'add-member', 
                [types.uint(0), types.principal(wallet1.address), types.uint(3), types.uint(1000)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'create-proposal', 
                [types.uint(0), types.principal(wallet2.address), types.uint(500), 
                 types.principal(deployer.address), types.utf8('Payment'), types.uint(144)], 
                wallet1.address),
            Tx.contractCall('stack-wallet', 'approve-proposal', 
                [types.uint(0)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'approve-proposal', 
                [types.uint(0)], 
                deployer.address)
        ]);
        
        block.receipts[3].result.expectOk();
        block.receipts[4].result.expectErr().expectUint(106); // err-already-voted
    },
});

Clarinet.test({
    name: "Owner can revoke member access",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'create-wallet', 
                [types.utf8('Test'), types.utf8('Test'), types.uint(2)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'add-member', 
                [types.uint(0), types.principal(wallet1.address), types.uint(3), types.uint(1000)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'revoke-access', 
                [types.uint(0), types.principal(wallet1.address)], 
                deployer.address)
        ]);
        
        block.receipts[2].result.expectOk().expectBool(true);
        
        // Verify member is inactive
        let block2 = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'get-member', 
                [types.uint(0), types.principal(wallet1.address)], 
                deployer.address)
        ]);
        
        const member = block2.receipts[0].result.expectOk().expectSome();
        assertEquals(member['active'], types.bool(false));
        assertEquals(member['spending-limit'], types.uint(0));
    },
});

Clarinet.test({
    name: "Owner can update member role and spending limit",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'create-wallet', 
                [types.utf8('Test'), types.utf8('Test'), types.uint(2)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'add-member', 
                [types.uint(0), types.principal(wallet1.address), types.uint(3), types.uint(500)], 
                deployer.address),
            Tx.contractCall('stack-wallet', 'update-member', 
                [types.uint(0), types.principal(wallet1.address), types.uint(2), types.uint(2000)], 
                deployer.address)
        ]);
        
        block.receipts[2].result.expectOk().expectBool(true);
        
        // Verify member was updated
        let block2 = chain.mineBlock([
            Tx.contractCall('stack-wallet', 'get-member', 
                [types.uint(0), types.principal(wallet1.address)], 
                deployer.address)
        ]);
        
        const member = block2.receipts[0].result.expectOk().expectSome();
        assertEquals(member['role'], types.uint(2)); // admin
        assertEquals(member['spending-limit'], types.uint(2000));
    },
});

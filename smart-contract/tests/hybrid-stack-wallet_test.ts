import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const ERR_NOT_ADMIN = 200;
const ERR_PAUSED = 201;
const ERR_NOT_INITIALIZED = 202;

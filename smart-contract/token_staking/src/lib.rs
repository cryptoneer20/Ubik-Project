use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use solana_program::entrypoint::ProgramResult;

declare_id!("FzyWy6xBXVPgwVBro5U9McLchdGRLLhh1pUZr1Tw36td");

pub mod constants {
    pub const POOL_CREATOR: &str = "";
}

#[program]
pub mod token_staking {
    use super::*;

    pub fn init_pool(ctx: Context<InitPool>, _apy: u64, _period: u64) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        pool.owner = ctx.accounts.owner.key();
        pool.rand = *ctx.accounts.rand.key;
        pool.token_mint = ctx.accounts.token_mint.key();
        pool.token_account = ctx.accounts.token_account.key();
        pool.apy = _apy;
        pool.period = _period;
        pool.tvl = 0;
        Ok(())
    }

    pub fn transfer_ownership(
        ctx: Context<TransferOwnership>,
        _new_owner: Pubkey,
    ) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        pool.owner = _new_owner;
        Ok(())
    }

    pub fn redeem_token(ctx: Context<RedeemToken>, amount: u64) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        let pool_seeds = &[pool.rand.as_ref(), &[ctx.bumps.pool]];
        let signer = &[&pool_seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info().clone(),
            Transfer {
                from: ctx.accounts.token_from.to_account_info().clone(),
                to: ctx.accounts.token_to.to_account_info().clone(),
                authority: pool.to_account_info().clone(),
            },
            signer,
        );
        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn init_staking_data(ctx: Context<InitStakingData>) -> ProgramResult {
        let staking_data = &mut ctx.accounts.staking_data;
        staking_data.owner = ctx.accounts.owner.key();
        staking_data.pool = ctx.accounts.pool.key();
        staking_data.stake_amount = 0;
        staking_data.total_reward = 0;
        staking_data.last_time = 0;
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        let staking_data = &mut ctx.accounts.staking_data;
        let clock = (&ctx.accounts.clock).unix_timestamp as u64;
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info().clone(),
            Transfer {
                from: ctx.accounts.token_from.to_account_info().clone(),
                to: ctx.accounts.token_to.to_account_info().clone(),
                authority: ctx.accounts.owner.to_account_info().clone(),
            },
        );
        token::transfer(cpi_ctx, amount)?;
        let new_reward_amount = (staking_data.stake_amount as u128 * pool.apy as u128 / 10000
            * (clock - staking_data.last_time) as u128
            / pool.period as u128) as u64;
        staking_data.total_reward = staking_data.total_reward + new_reward_amount;
        staking_data.stake_amount = staking_data.stake_amount + amount;
        staking_data.last_time = clock;

        pool.tvl = pool.tvl + amount;
        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        let staking_data = &mut ctx.accounts.staking_data;
        let clock = (&ctx.accounts.clock).unix_timestamp as u64;
        let pool_signer_seeds = &[pool.rand.as_ref(), &[ctx.bumps.pool]];
        let signer = &[&pool_signer_seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info().clone(),
            Transfer {
                from: ctx.accounts.token_from.to_account_info().clone(),
                to: ctx.accounts.token_to.to_account_info().clone(),
                authority: pool.to_account_info().clone(),
            },
            signer,
        );
        token::transfer(cpi_ctx, amount)?;

        let new_reward_amount = (staking_data.stake_amount as u128 * pool.apy as u128 / 10000
            * (clock - staking_data.last_time) as u128
            / pool.period as u128) as u64;
        staking_data.total_reward = staking_data.total_reward + new_reward_amount;
        staking_data.stake_amount = staking_data.stake_amount - amount;
        staking_data.last_time = clock;

        pool.tvl = pool.tvl - amount;
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        let staking_data = &mut ctx.accounts.staking_data;
        let clock = (&ctx.accounts.clock).unix_timestamp as u64;
        let new_reward_amount = (staking_data.stake_amount as u128 * pool.apy as u128 / 10000
            * (clock - staking_data.last_time) as u128
            / pool.period as u128) as u64;
        let pool_signer_seeds = &[pool.rand.as_ref(), &[ctx.bumps.pool]];
        let signer = &[&pool_signer_seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info().clone(),
            Transfer {
                from: ctx.accounts.token_from.to_account_info().clone(),
                to: ctx.accounts.token_to.to_account_info().clone(),
                authority: pool.to_account_info().clone(),
            },
            signer,
        );
        token::transfer(cpi_ctx, staking_data.total_reward + new_reward_amount)?;
        staking_data.total_reward = 0;
        staking_data.last_time = clock;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    owner: Signer<'info>,

    #[account(mut, seeds=[pool.rand.as_ref()], bump)]
    pool: Account<'info, Pool>,

    #[account(mut, has_one=owner, has_one=pool)]
    staking_data: Account<'info, StakingData>,

    #[account(mut, address=pool.token_account)]
    token_from: Account<'info, TokenAccount>,

    #[account(mut, constraint= token_to.mint==pool.token_mint)]
    token_to: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,

    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Unstake<'info> {
    #[account(mut)]
    owner: Signer<'info>,

    #[account(mut, seeds=[pool.rand.as_ref()], bump)]
    pool: Account<'info, Pool>,

    #[account(mut, has_one=owner, has_one=pool, constraint=amount<=staking_data.stake_amount)]
    staking_data: Account<'info, StakingData>,

    #[account(mut, address=pool.token_account)]
    token_from: Account<'info, TokenAccount>,

    #[account(mut, constraint= token_to.mint==pool.token_mint)]
    token_to: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,

    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    owner: Signer<'info>,

    #[account(mut)]
    pool: Account<'info, Pool>,

    #[account(mut, has_one=owner, has_one=pool)]
    staking_data: Account<'info, StakingData>,

    #[account(mut, has_one=owner, constraint= token_from.mint==pool.token_mint)]
    token_from: Account<'info, TokenAccount>,

    #[account(mut, address=pool.token_account)]
    token_to: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,

    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct InitStakingData<'info> {
    #[account(mut)]
    owner: Signer<'info>,

    pool: Account<'info, Pool>,

    #[account(init,
            seeds=[owner.key().as_ref(),pool.key().as_ref()],
            bump,
            payer=owner,
            space=8+STAKING_DATA_SIZE)]
    staking_data: Account<'info, StakingData>,

    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RedeemToken<'info> {
    #[account(mut)]
    owner: Signer<'info>,

    #[account(mut, has_one=owner, seeds=[pool.rand.as_ref()], bump)]
    pool: Account<'info, Pool>,

    #[account(mut, address=pool.token_account)]
    token_from: Account<'info, TokenAccount>,

    #[account(mut)]
    token_to: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TransferOwnership<'info> {
    #[account(mut)]
    owner: Signer<'info>,

    #[account(mut, has_one=owner)]
    pool: Account<'info, Pool>,
}

#[derive(Accounts)]
#[instruction(_apy: u64, _period: u64)]
pub struct InitPool<'info> {
    #[account(mut, address=constants::POOL_CREATOR.parse::<Pubkey>().unwrap())]
    owner: Signer<'info>,

    #[account(init,
        seeds=[(*rand.key).as_ref()],
        bump,
        payer=owner,
        space=8+POOL_SIZE,
        constraint= _apy<10000 && _period>0
    )]
    pool: Account<'info, Pool>,

    /// CHECK: Random Address
    rand: AccountInfo<'info>,

    token_mint: Account<'info, Mint>,

    #[account(constraint=token_account.owner==pool.key()
            && token_account.mint==token_mint.key())]
    token_account: Account<'info, TokenAccount>,

    system_program: Program<'info, System>,
}

pub const POOL_SIZE: usize = 32 + 32 + 32 + 32 + 8 + 8 + 8 + 40;
pub const STAKING_DATA_SIZE: usize = 32 + 32 + 8 + 8 + 8 + 40;

#[account]
pub struct Pool {
    pub owner: Pubkey,
    pub rand: Pubkey,
    pub token_mint: Pubkey,
    pub token_account: Pubkey,
    pub apy: u64,
    pub period: u64,
    pub tvl: u64,
}

#[account]
pub struct StakingData {
    pub owner: Pubkey,
    pub pool: Pubkey,
    pub stake_amount: u64,
    pub last_time: u64,
    pub total_reward: u64,
}

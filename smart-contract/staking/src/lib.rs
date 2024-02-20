use anchor_lang::{error, prelude::*};
use anchor_spl::token::{self, Mint, SetAuthority, Token, TokenAccount, Transfer};
use mpl_token_metadata::{self, accounts::*};
use solana_program::entrypoint::ProgramResult;
use spl_token::instruction::AuthorityType;

declare_id!("HQAvDkWvnxPxQNqwdDqmRVtN8JnGEv4tb2bpwH1EhSvk");

#[program]
pub mod staking {
    use super::*;

    pub fn init_pool(
        ctx: Context<InitPool>,
        _reward_period: u64,
        _reward_amount: Vec<u64>,
        _collection_creators: Vec<Pubkey>,
    ) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        pool.owner = ctx.accounts.owner.key();
        pool.rand = *ctx.accounts.rand.key;
        pool.reward_mint = ctx.accounts.reward_mint.key();
        pool.reward_account = ctx.accounts.reward_account.key();
        pool.reward_period = _reward_period;
        pool.reward_amount = _reward_amount;
        pool.collection_creators = _collection_creators;
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
        let pool = &ctx.accounts.pool;
        let staking_data = &mut ctx.accounts.staking_data;
        let metadata = Metadata::try_from(&ctx.accounts.metadata)?;
        let _edition = MasterEdition::try_from(&ctx.accounts.edition)?;
        if metadata.mint != ctx.accounts.nft_mint.key() {
            msg!("metadata is not matched");
            return Err(error!(PoolError::InvalidMetadata).into());
        }
        let mut verified = false;
        if metadata.creators.is_some() {
            if let Some(creators) = &metadata.creators {
                if creators.is_empty() {
                    return Err(error!(PoolError::InvalidMetadata).into());
                }
                for creator in creators.iter() {
                    for (i, collection_creator) in pool.collection_creators.iter().enumerate() {
                        if creator.address == *collection_creator && creator.verified == true {
                            staking_data.badge = i as u8;
                            verified = true;
                        }
                    }
                }
            }
        }
        if verified == false {
            return Err(error!(PoolError::InvalidMetadata).into());
        }
        staking_data.pool = pool.key();
        staking_data.nft_mint = ctx.accounts.nft_mint.key();
        Ok(())
    }

    pub fn stake_nft(ctx: Context<StakeNft>) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        let staking_data = &mut ctx.accounts.staking_data;
        let clock = (&ctx.accounts.clock).unix_timestamp as u64;
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info().clone(),
            SetAuthority {
                current_authority: ctx.accounts.staker.to_account_info().clone(),
                account_or_mint: ctx.accounts.nft_account.to_account_info().clone(),
            },
        );
        token::set_authority(cpi_ctx, AuthorityType::AccountOwner, Some(pool.key()))?;
        staking_data.nft_account = ctx.accounts.nft_account.key();
        staking_data.staker = ctx.accounts.staker.key();
        staking_data.stake_time = clock;
        staking_data.claim_number = 0;
        staking_data.is_staked = true;
        pool.total_number += 1;
        Ok(())
    }

    pub fn unstake_nft(ctx: Context<UnstakeNft>) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        let temp_pool = pool.clone();
        let staking_data = &mut ctx.accounts.staking_data;
        let clock = (&ctx.accounts.clock).unix_timestamp as u64;
        let pool_signer_seeds = &[temp_pool.rand.as_ref(), &[ctx.bumps.pool]];
        let signer = &[&pool_signer_seeds[..]];

        let number = (clock - staking_data.stake_time) / pool.reward_period;
        let amount =
            pool.reward_amount[staking_data.badge as usize] * (number - staking_data.claim_number);
        let cpi_ctx_token = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info().clone(),
            Transfer {
                from: ctx.accounts.token_from.to_account_info().clone(),
                to: ctx.accounts.token_to.to_account_info().clone(),
                authority: pool.to_account_info().clone(),
            },
            signer,
        );
        token::transfer(cpi_ctx_token, amount)?;
        staking_data.claim_number = number;

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info().clone(),
            SetAuthority {
                current_authority: temp_pool.to_account_info().clone(),
                account_or_mint: ctx.accounts.nft_account.to_account_info().clone(),
            },
            signer,
        );
        token::set_authority(
            cpi_ctx,
            AuthorityType::AccountOwner,
            Some(staking_data.staker),
        )?;
        staking_data.is_staked = false;
        staking_data.staker = Pubkey::default();
        pool.total_number -= 1;
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> ProgramResult {
        let pool = &mut ctx.accounts.pool;
        let staking_data = &mut ctx.accounts.staking_data;
        let clock = (&ctx.accounts.clock).unix_timestamp as u64;
        let number = (clock - staking_data.stake_time) / pool.reward_period;
        let amount =
            pool.reward_amount[staking_data.badge as usize] * (number - staking_data.claim_number);

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
        staking_data.claim_number = number;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    staker: Signer<'info>,

    #[account(mut, seeds=[pool.rand.as_ref()], bump)]
    pool: Account<'info, Pool>,

    #[account(mut, has_one=staker, has_one=pool, constraint=staking_data.is_staked==true)]
    staking_data: Account<'info, StakingData>,

    #[account(mut, address=pool.reward_account)]
    token_from: Account<'info, TokenAccount>,

    #[account(mut,
        constraint= token_to.mint==pool.reward_mint)]
    token_to: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,

    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct UnstakeNft<'info> {
    #[account(mut)]
    staker: Signer<'info>,

    #[account(mut, seeds=[pool.rand.as_ref()], bump)]
    pool: Account<'info, Pool>,

    #[account(mut, has_one=staker, has_one=pool, constraint=staking_data.is_staked==true)]
    staking_data: Account<'info, StakingData>,

    #[account(mut, constraint=nft_account.mint==staking_data.nft_mint)]
    nft_account: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,

    #[account(mut, address=pool.reward_account)]
    token_from: Account<'info, TokenAccount>,

    #[account(mut,
        constraint= token_to.mint==pool.reward_mint)]
    token_to: Account<'info, TokenAccount>,

    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct StakeNft<'info> {
    #[account(mut)]
    staker: Signer<'info>,

    #[account(mut)]
    pool: Account<'info, Pool>,

    #[account(mut, has_one=pool, constraint=staking_data.is_staked==false)]
    staking_data: Account<'info, StakingData>,

    #[account(mut, constraint=nft_account.mint==staking_data.nft_mint
            && nft_account.owner==staker.key()
            && nft_account.amount==1)]
    nft_account: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,

    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct InitStakingData<'info> {
    #[account(mut)]
    payer: Signer<'info>,

    pool: Account<'info, Pool>,

    #[account(constraint=nft_mint.decimals==0 && nft_mint.supply==1)]
    nft_mint: Account<'info, Mint>,

    #[account(owner=mpl_token_metadata::ID)]
    /// CHECK: Metadata Account
    metadata: AccountInfo<'info>,

    #[account(seeds=["metadata".as_bytes(), mpl_token_metadata::ID.as_ref(), nft_mint.key().as_ref(), "edition".as_bytes()], seeds::program= mpl_token_metadata::ID, bump, owner=mpl_token_metadata::ID)]
    /// CHECK: Metadata Account
    edition: AccountInfo<'info>,

    #[account(init,
            seeds=[nft_mint.key().as_ref(),pool.key().as_ref()],
            bump,
            payer=payer,
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

    #[account(mut, address=pool.reward_account)]
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
#[instruction(_reward_period: u64, _reward_amount : Vec<u64>, _collection_creators : Vec<Pubkey>)]
pub struct InitPool<'info> {
    #[account(mut)]
    owner: Signer<'info>,

    #[account(init,
        seeds=[(*rand.key).as_ref()],
        bump,
        payer=owner,
        space=8+MAX_POOL_SIZE,
        constraint= _reward_period>0 && _reward_amount.len()==_collection_creators.len() && _reward_amount.len() < 255
    )]
    pool: Account<'info, Pool>,

    /// CHECK: Random Address
    rand: AccountInfo<'info>,

    reward_mint: Account<'info, Mint>,

    #[account(constraint=reward_account.owner==pool.key()
            && reward_account.mint==reward_mint.key())]
    reward_account: Account<'info, TokenAccount>,

    system_program: Program<'info, System>,
}

pub const MAX_POOL_SIZE: usize = 32 + 32 + 32 + 32 + 8 + 4 + (8 * 5) + 4 + (32 * 5) + 8 + 1 + 40;
pub const STAKING_DATA_SIZE: usize = 32 + 32 + 32 + 1 + 32 + 8 + 8 + 1 + 40;

#[account]
pub struct Pool {
    pub owner: Pubkey,
    pub rand: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_account: Pubkey,
    pub reward_period: u64,
    pub reward_amount: Vec<u64>,
    pub collection_creators: Vec<Pubkey>,
    pub total_number: u64,
}

#[account]
pub struct StakingData {
    pub pool: Pubkey,
    pub nft_mint: Pubkey,
    pub nft_account: Pubkey,
    pub is_staked: bool,
    pub staker: Pubkey,
    pub stake_time: u64,
    pub claim_number: u64,
    pub badge: u8,
}

#[error_code]
pub enum PoolError {
    #[msg("Invalid metadata")]
    InvalidMetadata,
}

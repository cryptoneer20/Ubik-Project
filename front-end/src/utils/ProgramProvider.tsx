import { FC, useCallback, useMemo, ReactNode } from 'react';
import { ProgramContext } from './useProgram'
import { InfoStaking, InfoTokenStaking, confirmOptions } from './constants'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import * as anchor from "@project-serum/anchor";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token} from '@solana/spl-token'
import { sendTransactionWithRetry } from './utility';
import { programs } from '@metaplex/js'

const { metadata: { Metadata } } = programs

export interface ProgramProviderProps{
    children : ReactNode
}

export const ProgramProvider: FC<ProgramProviderProps> = ({children}) => {
    const wallet = useWallet()
    const {publicKey} = useWallet()
    const {connection: conn} = useConnection()
    
    const [program, tokenProgram] = useMemo(()=>{
        const provider = new anchor.Provider(conn, wallet as any, confirmOptions)
        const program =  new anchor.Program(InfoStaking.idl, InfoStaking.programId, provider)
        const tokenProgram = new anchor.Program(InfoTokenStaking.idl, InfoTokenStaking.programId, provider)
        return [program, tokenProgram]
    },[conn, wallet])

    const getNftPoolData = async() => {
        try{
            let poolData = await program.account.pool.fetch(InfoStaking.pool)
            return poolData
        }catch(err){
            return null
        }
    }

    const getNftsForOwner = async(owner: PublicKey) => {
        try{
            const allTokens: any[] = []
            const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {programId: TOKEN_PROGRAM_ID})
            for(let tokenAccount of tokenAccounts.value){
                try{
                    const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;
                    if(tokenAmount.amount === "1" && tokenAmount.decimals === 0){
                        let nftMint = new PublicKey(tokenAccount.account.data.parsed.info.mint)
                        let pda = await Metadata.getPDA(nftMint)
                        const accountInfo: any = await conn.getParsedAccountInfo(pda)
                        let metadata: any = new Metadata(owner.toString(), accountInfo.value)
                        for(let creator of metadata.data.data.creators){
                            let index = InfoStaking.reward.findIndex(function(a: any){return a.collection.toBase58()===creator.address && creator.verified===1})
                            if(index !== -1){
                                allTokens.push({
                                    badge: index,
                                    mint: nftMint,
                                    account: tokenAccount.pubkey,
                                    metadataAddress: pda,
                                    metadata: metadata.data.data,
                                })
                                break;
                            }
                        }
                    }
                }catch(err){

                }
            }
            allTokens.sort(function(a: any, b: any){
                if(a.badge > b.badge) return 1
                if(a.badge < b.badge) return -1
                return 0
            })
            return allTokens
        }catch(err){
            return []
        }
    }

    const getStakedNftsForOwner = async(owner: PublicKey) => {
        try{
            let allTokens: any[] = []
            const STAKING_DATA_SIZE = 8+32+32+32+1+32+8+8+1+1+40;
            let resp = await conn.getProgramAccounts(InfoStaking.programId, {
                dataSlice: {length:0, offset: 0},
                filters: [
                    {dataSize: STAKING_DATA_SIZE},
                    {memcmp: {offset:8, bytes: InfoStaking.pool.toBase58()}},
                    {memcmp: {offset:105, bytes: owner.toBase58()}}
                ]
            })
            for(let nftAccount of resp){
                let stakedNft = await program.account.stakingData.fetch(nftAccount.pubkey)
                if(stakedNft.isStaked === false) continue;
                try{
                    let pda = await Metadata.getPDA(stakedNft.nftMint)
                    const accountInfo: any = await conn.getParsedAccountInfo(pda)
                    let metadata: any = new Metadata(owner.toString(), accountInfo.value)
                    let time = new Date().getTime()/1000
                    let earnedWithIt = InfoStaking.reward[stakedNft.badge].amount * Math.floor((time - stakedNft.stakeTime.toNumber() + 30)/InfoStaking.rewardPeriod - stakedNft.claimNumber.toNumber())
                    allTokens.push({stakingData: stakedNft, stakingDataAddress: nftAccount.pubkey, earned: earnedWithIt>0 ? earnedWithIt : 0, metadata: metadata.data.data})
                }catch(err){

                }
            }
            allTokens.sort(function(a: any, b: any){
                if(a.stakingData.badge < b.stakingData.badge) return 1
                if(a.stakingData.badge > b.stakingData.badge) return -1
                return 0
            })
            return allTokens
        }catch(err){
            return []
        }
    }

    const stakeNft = useCallback(async(item: any) => {
        let address = publicKey!
        let instruction: TransactionInstruction[] = []
        let [stakingData, bump] = PublicKey.findProgramAddressSync([item.mint.toBuffer(), InfoStaking.pool.toBuffer()], InfoStaking.programId)
        if((await conn.getAccountInfo(stakingData))==null){
            instruction.push(program.instruction.initStakingData(new anchor.BN(bump),{
                accounts:{
                    payer: address,
                    pool: InfoStaking.pool,
                    nftMint: item.mint,
                    metadata: item.metadataAddress,
                    stakingData: stakingData,
                    systemProgram: SystemProgram.programId
                }
            }))
        }
        instruction.push(program.instruction.stakeNft({
            accounts:{
                staker: address,
                pool: InfoStaking.pool,
                stakingData: stakingData,
                nftAccount: item.account,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: SYSVAR_CLOCK_PUBKEY
            }
        }))
        await sendTransactionWithRetry(conn, wallet, instruction, [])
    }, [wallet])

    const unstakeNft = useCallback(async(item: any) => {
        let address = publicKey!
        let instruction: TransactionInstruction[] = []
        let tokenFrom = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoStaking.rewardToken,InfoStaking.pool,true)
        let tokenTo = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoStaking.rewardToken,address,true)
        if((await conn.getAccountInfo(tokenTo))==null)
            instruction.push(Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoStaking.rewardToken,tokenTo,address,address))
        instruction.push(program.instruction.unstakeNft({
            accounts:{
                staker: address,
                pool: InfoStaking.pool,
                stakingData: item.stakingDataAddress,
                nftAccount: item.stakingData.nftAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                tokenFrom: tokenFrom,
                tokenTo: tokenTo,
                clock: SYSVAR_CLOCK_PUBKEY
            }
        }))
        await sendTransactionWithRetry(conn, wallet, instruction, [])
    }, [wallet])

    const claim = useCallback(async(item: any) => {
        let address = publicKey!
        let instruction: TransactionInstruction[] = []
        let tokenFrom = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoStaking.rewardToken,InfoStaking.pool,true)
        let tokenTo = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoStaking.rewardToken,address,true)
        if((await conn.getAccountInfo(tokenTo))==null)
            instruction.push(Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoStaking.rewardToken,tokenTo,address,address))
        instruction.push(program.instruction.claimReward({
            accounts:{
                staker: address,
                pool: InfoStaking.pool,
                stakingData: item.stakingDataAddress,
                tokenFrom: tokenFrom,
                tokenTo: tokenTo,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: SYSVAR_CLOCK_PUBKEY
            }
        }))
        await sendTransactionWithRetry(conn, wallet, instruction, [])
    },[wallet])

    const getTokenBalance = async(owner: PublicKey) => {
        try{
            let tokenAccount = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoTokenStaking.token,owner,true)
            let tokenBalance = (await conn.getTokenAccountBalance(tokenAccount)).value
            return Number(tokenBalance.amount)/(10**InfoTokenStaking.decimals)
        }catch(err){
            return 0
        }
    }

    const getStakedTokenForOwner = async(owner: PublicKey) => {
        try{
            let [stakingDataAddress,] = PublicKey.findProgramAddressSync([owner.toBuffer(), InfoTokenStaking.pool.toBuffer()], InfoTokenStaking.programId)
            let stakingData = await tokenProgram.account.stakingData.fetch(stakingDataAddress)
            return stakingData
        }catch(err){
            return null
        }
    }

    const stakeToken = useCallback(async(amount)=>{
        let address = publicKey!
        let instruction: TransactionInstruction[] = []
        let [stakingData, bump] = PublicKey.findProgramAddressSync([address.toBuffer(), InfoTokenStaking.pool.toBuffer()], InfoTokenStaking.programId)
        let tokenFrom = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoTokenStaking.token,address,true)
        let tokenTo = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoTokenStaking.token,InfoTokenStaking.pool,true)
        if((await conn.getAccountInfo(stakingData))==null){
            instruction.push(tokenProgram.instruction.initStakingData(new anchor.BN(bump),{
                accounts:{
                    owner: address,
                    pool: InfoTokenStaking.pool,
                    stakingData: stakingData,
                    systemProgram: SystemProgram.programId
                }
            }))
        }
        instruction.push(tokenProgram.instruction.stake(new anchor.BN((amount * (10**InfoTokenStaking.decimals)).toString()),{
            accounts:{
                owner: address,
                pool: InfoTokenStaking.pool,
                stakingData: stakingData,
                tokenFrom: tokenFrom,
                tokenTo: tokenTo,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: SYSVAR_CLOCK_PUBKEY
            }
        }))
        await sendTransactionWithRetry(conn, wallet, instruction, [])
    },[wallet])

    const unstakeToken = useCallback(async(amount)=>{
        let address = publicKey!
        let instruction: TransactionInstruction[] = []
        let [stakingData, ] = PublicKey.findProgramAddressSync([address.toBuffer(), InfoTokenStaking.pool.toBuffer()], InfoTokenStaking.programId)
        let tokenTo = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoTokenStaking.token,address,true)
        let tokenFrom = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoTokenStaking.token,InfoTokenStaking.pool,true)
        if((await conn.getAccountInfo(tokenTo))==null)
            instruction.push(Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoTokenStaking.token,tokenTo,address,address))
        instruction.push(tokenProgram.instruction.unstake(new anchor.BN((amount * (10**InfoTokenStaking.decimals)).toString()),{
            accounts:{
                owner: address,
                pool: InfoTokenStaking.pool,
                stakingData: stakingData,
                tokenFrom: tokenFrom,
                tokenTo: tokenTo,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: SYSVAR_CLOCK_PUBKEY
            }
        }))
        await sendTransactionWithRetry(conn, wallet, instruction, [])
    },[wallet])

    const claimToken = useCallback(async()=>{
        let address = publicKey!
        let instruction: TransactionInstruction[] = []
        let [stakingData, ] = PublicKey.findProgramAddressSync([address.toBuffer(), InfoTokenStaking.pool.toBuffer()], InfoTokenStaking.programId)
        let tokenTo = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoTokenStaking.token,address,true)
        let tokenFrom = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoTokenStaking.token,InfoTokenStaking.pool,true)
        if((await conn.getAccountInfo(tokenTo))==null)
            instruction.push(Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,InfoTokenStaking.token,tokenTo,address,address))
        instruction.push(tokenProgram.instruction.claimReward({
            accounts:{
                owner: address,
                pool: InfoTokenStaking.pool,
                stakingData: stakingData,
                tokenFrom: tokenFrom,
                tokenTo: tokenTo,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: SYSVAR_CLOCK_PUBKEY
            }
        }))
        await sendTransactionWithRetry(conn, wallet, instruction, [])
    },[wallet])

    return <ProgramContext.Provider value={{
        getNftPoolData,
        getNftsForOwner,
        getStakedNftsForOwner,

        stakeNft,
        unstakeNft,
        claim,

        getTokenBalance,
        getStakedTokenForOwner,

        stakeToken,
        unstakeToken,
        claimToken,
    }}>{children}</ProgramContext.Provider>
}
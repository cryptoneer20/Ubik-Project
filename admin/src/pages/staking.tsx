import { useState, useEffect, useMemo } from 'react';
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {Keypair,PublicKey,Transaction,ConfirmOptions,SystemProgram} from '@solana/web3.js'
import {TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,Token} from "@solana/spl-token";
import useNotify from './notify'
import * as anchor from "@project-serum/anchor";

let wallet : any
let notify: any

const programId = new PublicKey('C6wGW14B9SUBsG1xVENNvtCeyBgBzbfzbaVaLTtCEuwc')
const idl = require('./staking.json')
const tokenIdl = require('./token_staking.json')
const tokenProgramId = new PublicKey('8h6FVYBoSNKYVMRKp7DvjHdkvkcyrK8ug8TibtiSorkc')
const confirmOption : ConfirmOptions = {commitment : 'finalized',preflightCommitment : 'finalized',skipPreflight : false}

// const STAKING_DATA_SIZE = 8+32+32+32+1+32+8+8+1+1+40;

export default function Staking(){
	wallet = useWallet()
	notify = useNotify()
	const {connection: conn} = useConnection()

	const poolInfo = {
		rewardToken: new PublicKey("DjQLmpLp6PiPv9RqHXtqia4itdWCrBcdSSj4wSwLHZzD"),
		rewardPeriod: 30,
		decimals: 9,
		reward: [
				{collection: new PublicKey("EUanG7nVAXnH43mQFTgfyxMYeEdTjNiZFtFswBJmXzki"), amount: 100},
				{collection: new PublicKey("8CtXuE1GaJKtGBiSHqzdU1XrUGcaDNc2sjoLVFi7hMxJ"), amount: 1000},
				{collection: new PublicKey("8VG4sGuEeWK9bxKUDdfSFRCCggc339mWgcR1hpJ24ASs"), amount: 10000},
				{collection: new PublicKey("A1SsJVezX7214m26m8stU8KS2goEUhRFheiLQu7VCrdu"), amount: 100000},
				{collection: new PublicKey("4sFheFkruEk6XN8cEnkfmj2jZbY7wB57PB5TeFwWy9k6"), amount: 1000000}, 
			],
	}

	const tokenPoolInfo = {
		token: new PublicKey("DjQLmpLp6PiPv9RqHXtqia4itdWCrBcdSSj4wSwLHZzD"),
		period: 300,
		decimals: 9,
		apy: 2000,
	}

	const [newPool, setNewPool] = useState('')
	const [newTokenPool, setNewTokenPool] = useState('')

	// const [curPool, setCurPool] = useState('44Y8uW6EvWTxkEaVdTA933ufyxc5GhLvcWb9FpqUMWw2')
	// const [poolData, setPoolData] = useState<any>(null)

	// const [stakeNft, setStakeNft] = useState('')
	// const [stakingData, setStakingData] = useState<any>(null)
	
	const [tokenProgram, program] = useMemo(()=>{
		const provider = new anchor.Provider(conn, wallet as any, confirmOption)
		const program = new anchor.Program(idl, programId, provider)
		const tokenProgram = new anchor.Program(tokenIdl, tokenProgramId, provider)
		return [tokenProgram, program]
	}, [])

	// useEffect(()=>{
	// 	getPoolData()
	// },[curPool])

	// useEffect(()=>{
	// 	getStakingData()
	// },[stakeNft])


	// const getStakingData = async() => {
	// 	try{
	// 		const nftAddress = new PublicKey(stakeNft)
	// 		const pool = new PublicKey(curPool)
	// 		const [stakingDataAddress,] = await PublicKey.findProgramAddress([nftAddress.toBuffer(), pool.toBuffer()], programId)
	// 		setStakingData(await program.account.stakingData.fetch(stakingDataAddress))
	// 	}catch(err){
	// 		setStakingData(null)
	// 	}
	// }

	// const getPoolData = async() => {
	// 	try{
	// 		const pool = new PublicKey(curPool)
	// 		const pD = await program.account.pool.fetch(pool)
	// 		console.log(pD)
	// 		setPoolData(pD)
	// 	}catch(err){
	// 		console.log(err)
	// 		setPoolData(null)
	// 	}
	// }

	const initPool = async() =>{
		try{
			let transaction = new Transaction()
			const rand = Keypair.generate().publicKey;
		 	const [pool, bump] = await PublicKey.findProgramAddress([rand.toBuffer()],programId)
			console.log(pool.toBase58())
		 	const rewardPoolAccount = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, poolInfo.rewardToken, pool, true)
			transaction.add(Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, poolInfo.rewardToken, rewardPoolAccount, pool, wallet.publicKey))
			transaction.add(program.instruction.initPool(
			  	new anchor.BN(bump),
			  	new anchor.BN(poolInfo.rewardPeriod),
			  	poolInfo.reward.map((item)=>{return new anchor.BN(item.amount * (10**poolInfo.decimals))}),
			  	poolInfo.reward.map((item)=>{return item.collection}),
			  	{
			  		accounts:{
			  			owner : wallet.publicKey,
			  			pool : pool,
			  			rand : rand,
			  			rewardMint : poolInfo.rewardToken,
			  			rewardAccount : rewardPoolAccount,
			  			systemProgram : SystemProgram.programId,
			  		}
			  	}
			))
		  await sendTransaction(transaction, [])
		  notify('success', 'Success!')
		  setNewPool(pool.toBase58())
		}catch(err){
			console.log(err)
			notify('error', 'Failed Instruction!')
		}
	}

	const initTokenPool = async() => {
		try{
			let transaction = new Transaction()
			const rand = Keypair.generate().publicKey;
		 	const [pool, bump] = await PublicKey.findProgramAddress([rand.toBuffer()],tokenProgramId)
			console.log(pool.toBase58())
			const poolAccount = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,tokenPoolInfo.token,pool,true)
			transaction.add(Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID,tokenPoolInfo.token,poolAccount,pool,wallet.publicKey))
			transaction.add(tokenProgram.instruction.initPool(
				new anchor.BN(bump),
				new anchor.BN(tokenPoolInfo.apy),
				new anchor.BN(tokenPoolInfo.period),
				{
					accounts:{
						owner : wallet.publicKey,
			  			pool : pool,
			  			rand : rand,
			  			tokenMint : tokenPoolInfo.token,
			  			tokenAccount : poolAccount,
			  			systemProgram : SystemProgram.programId,
					}
				}
			))
			await sendTransaction(transaction, [])
			notify('success', 'Success!')
			setNewTokenPool(pool.toBase58())
		}catch(err){
			console.log(err)
			notify('error', 'Failed Instruction!')
		}
	}

	async function sendTransaction(transaction : Transaction, signers : Keypair[]) {
		transaction.feePayer = wallet.publicKey
		transaction.recentBlockhash = (await conn.getRecentBlockhash('max')).blockhash;
		await transaction.setSigners(wallet.publicKey,...signers.map(s => s.publicKey));
		if(signers.length !== 0) await transaction.partialSign(...signers)
		const signedTransaction = await wallet.signTransaction(transaction);
		let hash = await conn.sendRawTransaction(await signedTransaction.serialize());
		await conn.confirmTransaction(hash);
		return hash
	}

	return <div className="container-fluid mt-4 row">
		<div className="col-md-6 mb-5">
			<h4>CREATE NFT STAKING POOL</h4>
		  	<div className="row container-fluid mb-3 p-3">
				<button type="button" disabled={!(wallet && wallet.connected)} className="btn btn-primary mb3" onClick={async ()=>{
					await initPool()
				}}>CREATE NFT STAKING POOL</button>
			</div>
			<h6>{newPool}</h6>
			<div className="row container-fluid mb-3 p-3">
				<button type="button" disabled={!(wallet && wallet.connected)} className="btn btn-primary mb3" onClick={async ()=>{
					await initTokenPool()
				}}>CREATE TOKEN STAKING POOL</button>
			</div>
			<h6>{newTokenPool}</h6>
		</div>
		{/* <div className="col-md-6 mb-5">
			<div className="input-group">
		        <span className="input-group-text">Current Pool</span>
		        <input name="curPool"  type="text" className="form-control" onChange={(event)=>{setCurPool(event.target.value)}} value={curPool}/>
		    </div>

			<div className="input-group">
		        <span className="input-group-text">Staked NFT Address</span>
		        <input name="stakeNft"  type="text" className="form-control" onChange={(event)=>{setStakeNft(event.target.value)}} value={stakeNft}/>
		    </div>
			{
				stakingData!==null && <>
					<p>{stakingData.isStaked ? "Available" : "Not Available"}</p>
					<p>Staker : {stakingData.staker.toBase58()}</p>
				</>
			}
		</div> */}
	</div>
}
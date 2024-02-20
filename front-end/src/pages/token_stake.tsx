import { useEffect, useState } from "react"
import { useProgram } from "../utils/useProgram"
import useNotify from "../utils/notify"
import { useWallet } from "@solana/wallet-adapter-react"
import { InfoTokenStaking } from "../utils/constants"

export default function TokenStake(){
    const {getTokenBalance, getStakedTokenForOwner, stakeToken, unstakeToken, claimToken} = useProgram()
    const wallet = useWallet()
    const {publicKey} = useWallet()
    const notify = useNotify()
    const [inputAmount, setInputAmount] = useState('')
    const [ownedTokenBalance, setOwnedTokenBalance] = useState(0)
    const [stakedTokenBalance, setStakedTokenBalance] = useState(0)

    useEffect(()=>{
        getOwnedTokenBalance()
        getStakedData()
    },[publicKey])

    useEffect(()=>{
        const interval = setInterval(()=>{getOwnedTokenBalance();getStakedData();},10000)
        return ()=>clearInterval(interval)
    },[publicKey])

    const getOwnedTokenBalance = async() => {
        if(publicKey!=null)
            setOwnedTokenBalance(await getTokenBalance(publicKey))
        else
            setOwnedTokenBalance(0)
    }

    const getStakedData = async() => {
        if(publicKey!=null){
            let stakedData = await getStakedTokenForOwner(publicKey)
            if(stakedData!=null){
                setStakedTokenBalance(stakedData.stakeAmount.toNumber()/10**InfoTokenStaking.decimals)
            }else{
                setStakedTokenBalance(0)
            }
        }else{
            setStakedTokenBalance(0)
        }
    }

    return <div className='stake-status justify-self-center w-full'>
        <hr />
        <div className='grid sm:px-20 px-5 pt-5'>
            <div className='text-gray-100 text-2xl'>
                Current Ubik Token Balance : &nbsp;
                <span className='text-rose-500'>{ownedTokenBalance}</span>
            </div>
            <div className='text-gray-100 text-2xl'>
                Your Staked Ubik Token Balance : &nbsp;
                <span className='text-rose-500'>{stakedTokenBalance}</span>
            </div>

            <div className='board-purple rounded-xl py-5 md:w-full my-8 grid justify-items-center text-xs'>
                <div className='pb-5'>
                    <img src={process.env.PUBLIC_URL + "./assets/token_logo.png"} style={{height:"20vh"}} alt="token logo" />
                </div>
                <div className='flex font-bold text-gray-200 mx-2'>
                    <input type="text" className="rounded-lg text-center input-size w-44 mx-auto input-bg"  onChange={(e)=>{setInputAmount(e.target.value)}} value={inputAmount} />
                    <button className='mx-2 bg-purple-600 hover:bg-purple-700 p-2 rounded-lg transition duration-150' onClick={async()=>{
                        setInputAmount(ownedTokenBalance.toString())
                    }}>MAX</button>
                </div>
                <button className='mx-2 mt-10 px-10 py-2 button-bg text-gray-100 rounded-lg transition duration-150' onClick={async()=>{
                    try{
                        let amount = Number(inputAmount)
                        if(amount<=0 || isNaN(amount)) throw new Error('Invalid amount')
                        await stakeToken(amount)
                        notify('success', 'Staked successfully')
                    }catch(err: any){
                        notify('error', err.message)
                    }
                }}>STAKE</button>
                <div className='flex'>
                    <button className='mx-2 mt-10 px-10 py-2 button-bg text-gray-100 rounded-lg transition duration-150' onClick={async()=>{
                        try{
                            await claimToken()
                            notify('success', 'Claimed successfully')
                        }catch(err: any){
                            notify('error', err.message)
                        }
                    }}>Claim</button>
                    <button className='mx-2 mt-10 px-10 py-2 button-bg text-gray-100 rounded-lg transition duration-150' onClick={async()=>{
                        try{
                            let amount = Number(inputAmount)
                            if(amount<=0 || isNaN(amount)) throw new Error('Invalid amount')
                            await unstakeToken(amount)
                            notify('success', 'Unstaked successfully')
                        }catch(err: any){
                            notify('error', err.message)
                        }
                    }}>Unstake</button>
                </div>
            </div>
        </div>
    </div>
}
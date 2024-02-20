import { useWallet } from "@solana/wallet-adapter-react"
import { useProgram } from "../utils/useProgram"
import { useEffect, useState } from "react"
import { InfoStaking } from "../utils/constants"
import ReactPaginate from 'react-paginate'
import NftCard from "../components/NftCard"
import StakedNftCard from "../components/StakedNftCard"

export default function NftStake(){
    const {getNftsForOwner, getStakedNftsForOwner, getNftPoolData} = useProgram()
    const {publicKey} = useWallet()
    
    const [poolData, setPoolData] = useState<any>(null)
    const [ownedNfts, setOwnedNfts] = useState<any[]>([])
    const [stakedNfts, setStakedNfts] = useState<any[]>([])
    const [showStaked, setShowStaked] = useState(false)
    const [showCollection, setShowCollection] = useState("All")
    // const [itemsPerPage, setItemsPerPage] = useState(1)
    // const [pageCount, setPageCount] = useState(0)
    // const [stakedPageCount , setStakedPageCount] = useState(0)

    useEffect(()=>{
        getPoolData()
    },[])

    useEffect(()=>{
        const interval = setInterval(()=>{getPoolData()}, 10000)
        return ()=>clearInterval(interval)
    },[])

    const getPoolData = async() => {
        let pool = await getNftPoolData()
        if(pool!=null) setPoolData({
            totalNfts: pool.totalNumber.toNumber()
        })
    }

    useEffect(()=>{
        getOwnedNfts()
        getStakedNfts()
    },[publicKey])

    // useEffect(()=>{
    //     const interval = setInterval(()=>{getOwnedNfts(); getStakedNfts();}, 20000)
    //     return ()=>clearInterval(interval)
    // },[publicKey])

    const getOwnedNfts = async() => {
        if(publicKey!=null)
            setOwnedNfts(await getNftsForOwner(publicKey))
        else
            setOwnedNfts([])
    }

    const getStakedNfts = async() => {
        if(publicKey!=null)
            setStakedNfts(await getStakedNftsForOwner(publicKey))
        else
            setStakedNfts([])
    }

    // const handlePageClick = (e : any) => {
    // };
    // const handleStakedPageClick = (e: any) => {
    // }
    const onOptionChangeHandler = (e: any) => {
        setShowCollection(e.target.value)
        // let badge = 0
        // if(e.target.value !== "All")
        //     for(let i=0; i<InfoStaking.reward.length; i++){
        //         if(InfoStaking.reward[i].badge === e.target.value){
        //             badge = i;
        //             break;
        //         }
        //     }
        // setPageCount(ownedNfts.filter(function(nft:any){
        //     return e.target.value==="All" || badge===nft.badge
        // }).length/itemsPerPage)
        // setStakedPageCount(stakedNfts.filter(function(nft:any){
        //     return e.target.value==="All" || badge===nft.stakingData.badge
        // }).length/itemsPerPage)
    }
    
    return <div className='stake-status justify-self-center w-full'>
        <div className='grid text-left md:flex md:justify-between pb-5'>
            <div className='board-purple rounded-xl py-5 px-6 md:w-full mx-4 sm:mx-10 md:mx-20 my-4'>
                <p className=' text-neutral-400 text-sm font-bold '>
                    Total Ubik Capital Staked
                </p>
                <p className='py-1 text-gray-200 text-4xl font-bold'>
                    {poolData==null ? 0 : ((stakedNfts.length * 100)/poolData.totalNfts).toFixed(2)}%
                </p>
                <div className="w-full bg-red-300 rounded-full dark:bg-gray-700 my-2">
                    <div className="bg-rose-600 progress-bar font-medium text-blue-100 text-center p-0.5 leading-none rounded-full"
                        style={{width: poolData == null ? 0 : ((stakedNfts.length * 100)/poolData.totalNfts).toFixed(2) + "%"}}>
                    </div>
                </div>
            </div>
            <div className='board-purple rounded-xl py-5 px-6 md:w-full mx-4 sm:mx-10 md:mx-20 my-4'>
                <p className='text-neutral-400 text-sm font-bold'>My Staked Ubik Capital</p>
                <p className='py-2 text-gray-200 text-4xl font-bold'>{stakedNfts.length}</p>
            </div>
        </div>
        <div className='flex justify-between mb-2 text-12px text-gray-200'>
            <div className=''>
                <button onClick={() => setShowStaked(false)} className={!showStaked? "stake-button mx-2" : "stake-button-before mx-2"} >Unstaked</button>
                <button onClick={() => setShowStaked(true)} className={showStaked? "stake-button" : "stake-button-before"} >Staked</button>
            </div>
            <div className=''>
                <button type="button" className="stake-button mx-2" style={{ background: "#eb2b63"}} onClick={async ()=>{
                    
                }}>Claim All</button>
            </div>
        </div>
        <hr />
        <div className="px-10 w-full grid justify-items-stretch">
            <div className="justify-self-center w-full">
                <div className="justify-self-center">
                {
                    !showStaked ?
                        <div className="w-full flex flex-wrap justify-center">
                            {
                                ownedNfts.filter(function(item: any){return showCollection==="All" || InfoStaking.reward[item.badge].badge===showCollection}).map((nft : any, idx : any) => {
                                    return <NftCard key={idx} nft={nft}/>
                                })
                            }
                            <div className='w-full grid justify-items-stretch custom-font text-12px'>
                                <div className="flex justify-self-end">
                                    <select onChange={onOptionChangeHandler} 
                                        className="text-gray-100 text-center back-red rounded-md shadow-sm outline-none h-8 my-2 text-12px" >
                                        <option >All</option>
                                        {
                                            InfoStaking.reward.map((item, idx) => 
                                                <option key={idx} value={item.badge}>{item.badge}</option>
                                            )
                                        }
                                    </select>
                                </div>
                            </div>
                        </div>
                    :
                        <div className="w-full flex flex-wrap justify-center">
                            {
                                stakedNfts.filter(function(item: any){return showCollection==="All" || InfoStaking.reward[item.stakingData.badge].badge===showCollection}).map((nft : any ,idx : any)=>{
                                    return <StakedNftCard key={idx} nft={nft}/>
                                })
                            }
                            <div className='w-full grid justify-items-stretch custom-font text-12px'>
                                <div className="flex justify-self-end">
                                    <select onChange={onOptionChangeHandler} 
                                        className="text-gray-100 text-center back-red rounded-md shadow-sm outline-none h-8 my-2 text-12px" >
                                        <option >All</option>
                                        {
                                            InfoStaking.reward.map((item, idx) => 
                                                <option key={idx} value={item.badge}>{item.badge}</option>
                                            )
                                        }
                                    </select>
                                </div>
                            </div>
                        </div>
                }
                </div>                    
            </div>
        </div>
    </div>
}
import axios from 'axios'
import { useEffect, useState } from 'react'
import { InfoStaking } from '../utils/constants'
import { useProgram } from '../utils/useProgram'
import useNotify from '../utils/notify'

export default function NftCard(props: any){
    const {stakeNft} = useProgram()
    const notify = useNotify()
    const [nftDetailInfo, setNftDetailInfo] = useState<any>(null)

    useEffect(()=>{
        getNftDetailInfo()
    },[])

    const getNftDetailInfo = async() => {
        let data = (await axios.get(props.nft.metadata.uri)).data
        setNftDetailInfo(data)
    }

    return <div className="card board-purple my-3 mx-4 w-full justify-self-stretch" style={{width : "150px"}}>
        <div style={{height : "150px"}}>
        {
            nftDetailInfo!=null &&
                <img className="card-img-top image-disable" src={nftDetailInfo.image} alt="NFT" />
        }
        </div>
        <div className="w-full text-center bottom-0">{InfoStaking.reward[props.nft.badge].badge}</div>
        <div className="w-full text-center bottom-0">{props.nft.metadata.name}</div>
        <div className="grid justify-items-left my-2">
            <button type="button" className="mx-1 px-5 pb-2 pt-1 button-bg text-gray-200 rounded-lg transition duration-150" onClick={async ()=>{
                try{
                    await stakeNft(props.nft)
                    notify('success', "Staked successfully")
                }catch(err: any){
                    notify('error',err.message)
                }
            }}>Stake</button>
        </div>
    </div>
}
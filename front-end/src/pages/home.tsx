import {WalletConnect} from '../wallet';
import {useState} from 'react'
import TokenStake from './token_stake';
import NftStake from './nft_stake';

const stakePageStyle = {
  color: "rgb(235, 43, 99)",
}

const footerStyle = {
  textDecoration: "none",
  paddingTop: "0.8rem",
  paddingBottom: "0.8rem",
  fontSize: "0.65rem",
  lineHeight: "1rem",
}

export default function Stake() {
  const [ stakePage, setStakePage ] = useState(false);
  return (
    <div className="App flex flex-col bg-cover bg-center" style={{backgroundImage: `url(${process.env.PUBLIC_URL + './assets/bg.jpg'})`}} >
      <header className='py-7 sm:px-6 '>
        <nav className='grid gap-y-5 md:flex gap-auto md:justify-between w-full'>
          <div className='justify-self-center md:justify-self-start' style={{width: "12rem"}}>
            <a href="https://ubik.capital">
              <img src={process.env.PUBLIC_URL + "./assets/logo.svg"}  style={{height: "65px"}} alt="logo"/>
            </a>
          </div>
          <div className='flex text-xl justify-self-center gap-10 sm:gap-16 text-gray-200 grid grid-cols-2 h-full align-middle'>
            <button onClick={() => setStakePage(false)} className='hover:text-rose-500 transition duration-150' style={!stakePage ? stakePageStyle : {}}>NFTs Staking</button>
            <button onClick={() => setStakePage(true)} className='hover:text-rose-500 transition duration-150' style={stakePage ? stakePageStyle : {}}>Token Staking</button>
          </div>
          <div className='justify-self-center grid justify-items-center md:justify-self-end' style={{width: "12rem"}}>
            <WalletConnect />
          </div>
        </nav>
      </header>

      <main className='w-full flex-1 grid py-8 px-3 md:px-5 '>
      {
        !stakePage?
          <NftStake/>
        :
          <TokenStake/>
      }
      </main>

      <footer className='bottom-0  insert-x-0 w-full'>
        <div className='grid justify-items-center'>
          <a href="https://ubik.capital/" className='flex text-neutral-400 text-sm' style={footerStyle}>
            <span className='text-gray-100 inline-block align-text-bottom font-bold' >Powered by</span>
            &nbsp;
            Ubik Capital
          </a>
        </div>
      </footer>
    </div>
  );
}
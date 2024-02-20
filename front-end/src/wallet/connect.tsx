import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
// import styled from 'styled-components';
// import {
//   styled
// } from 'styled-components';

const walletButton = {
    backgroundColor: "rgb(235, 43, 99)",
    fontWeight: "bold",
}

export default function WalletConnect(): JSX.Element {
  // return <WallletConnectButton />;
  return <WalletMultiButton style={walletButton} />;
}

// const WallletConnectButton = styled(WalletMultiButton)`
//   width: 12rem;
//   background-color: rgb(235, 43, 99);
//   font-weight: bold;
// `;
import { createContext, useContext } from "react";
import { PublicKey } from '@solana/web3.js';

export interface ProgramContextState{
    getNftPoolData() : Promise<any>;
    getNftsForOwner(owner: PublicKey) : Promise<any[]>;
    getStakedNftsForOwner(owner: PublicKey) : Promise<any[]>;

    stakeNft(item: any) : void;
    unstakeNft(item: any) : void;
    claim(item: any) : void;

    getTokenBalance(owner: PublicKey) : Promise<number>;
    getStakedTokenForOwner(owner: PublicKey) : Promise<any>;

    stakeToken(amount: number) : void;
    unstakeToken(amount: number) : void;
    claimToken() : void;
}

export const ProgramContext = createContext<ProgramContextState>({
} as ProgramContextState)

export function useProgram() : ProgramContextState{
    return useContext(ProgramContext)
}
import "@/styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import LayoutApp from "@/components/Layout";
import { MainContext } from "@/utils/context";
import { WebBundlr } from "@bundlr-network/client";
import {
  LivepeerConfig,
  createReactClient,
  studioProvider,
} from "@livepeer/react";
import { MantineProvider } from "@mantine/core";
import { NotificationsProvider } from "@mantine/notifications";
import {
  connectorsForWallets,
  RainbowKitProvider,
  Wallet,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import {
  Hydrate,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { providers, utils } from "ethers";
import type { NextComponentType } from "next";
import type { AppProps as NextAppProps } from "next/app";
import NextHead from "next/head";
import { useState, useMemo, useRef } from "react";
import { configureChains, createClient, WagmiConfig } from "wagmi";
import { Chain, polygonMumbai, hardhat, fantom, bsc } from "wagmi/chains";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";

const CantoChain: Chain = {
  id: 7700,
  name: "CANTO",
  network: "canto",
  nativeCurrency: {
    decimals: 18,
    name: "CANTO",
    symbol: "CANTO",
  },
  rpcUrls: {
    default: {
      http: ["https://canto.slingshot.finance/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: "https://evm.explorer.canto.io/",
    },
  },
  testnet: false,
};

const MantleChain: Chain = {
  id: 5001,
  name: "Mantle",
  network: "mantle",
  nativeCurrency: {
    symbol: "BIT",
    decimals: 18,
    name: "BIT",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.mantle.xyz/"],
    },
  },
  testnet: true,
};

const FilecoinChain: Chain = {
  id: 314,
  name: "Filecoin",
  network: "filecoin",
  nativeCurrency: {
    symbol: "FIL",
    decimals: 18,
    name: "FIL",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.ankr.com/filecoin"],
    },
  },
  testnet: false,
};

type AppProps<P = any> = NextAppProps & {
  pageProps: P;
  Component: NextComponentType & {
    getLayout?: (page: React.ReactElement) => React.ReactNode;
  };
} & Omit<NextAppProps<P>, "pageProps">;

export interface MyWalletOptions {
  chains: Chain[];
}
export const UD = ({ chains }: MyWalletOptions): Wallet => ({
  id: "uauth",
  name: "Unstoppable Login",
  iconUrl: "https://evm.pinsave.app/UnstoppableDomains.png",
  iconBackground: "#0c2f78",
  createConnector: () => {
    const connector = new MetaMaskConnector({ chains });
    return {
      connector,
    };
  },
});

const { chains, provider, webSocketProvider } = configureChains(
  [
    ...(process.env.NEXT_PUBLIC_DEV === "true" ? [hardhat] : []),
    polygonMumbai,
    fantom,
    bsc,
    CantoChain,
    MantleChain,
    FilecoinChain,
  ],
  [
    alchemyProvider({
      apiKey: process.env.NEXT_ALCHEMY_ID,
    }),
    publicProvider(),
    jsonRpcProvider({
      rpc: (chain) => {
        return { http: chain.rpcUrls.default.http[0] };
      },
    }),
  ]
);

const connectors = connectorsForWallets([
  {
    groupName: "Recommended",
    wallets: [
      injectedWallet({ chains }),
      rainbowWallet({ chains }),
      metaMaskWallet({ chains }),
    ],
  },
  {
    groupName: "Others",
    wallets: [
      coinbaseWallet({ chains, appName: "My RainbowKit App" }),
      walletConnectWallet({ chains }),
      UD({ chains }),
    ],
  },
]);

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
  webSocketProvider,
});

function MyApp({ Component, pageProps }: AppProps) {
  const [bundlrInstance, setBundlrInstance] = useState<WebBundlr>();
  const [balance, setBalance] = useState<string>();
  const bundlrRef = useRef<any>();

  const [queryClient] = useState(() => new QueryClient());
  const livepeerClient = useMemo(() => {
    return createReactClient({
      provider: studioProvider({
        apiKey: process.env.NEXT_PUBLIC_LIVEPEER,
      }),
    });
  }, []);

  async function initialiseBundlr() {
    if (window.ethereum) {
      const provider = new providers.Web3Provider(window.ethereum as any);
      await provider._ready();

      /* const bundlr = new WebBundlr(
              "https://node1.bundlr.network",
              "matic",
              provider
            ); */
      const bundlr = new WebBundlr(
        "https://devnet.bundlr.network",
        "matic",
        provider,
        {
          providerUrl: "https://rpc-mumbai.matic.today",
        }
      );

      await bundlr.ready();

      setBundlrInstance(bundlr);
      bundlrRef.current = bundlr;
      fetchBalance();
    }
  }

  async function fetchBalance() {
    const bal = await bundlrRef.current.getLoadedBalance();
    console.log("bal: ", utils.formatEther(bal.toString()));
    setBalance(utils.formatEther(bal.toString()));
  }

  return (
    <MantineProvider
      theme={{
        colorScheme: "light",
        primaryColor: "green",
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Hydrate state={pageProps.dehydratedState} />
        <WagmiConfig client={wagmiClient}>
          <NextHead>
            <title>Pin Save - decentralized Pinterest</title>
            <meta
              name="description"
              content="Pin Save is a platform for decentralized content aggregation and image sharing where users have content ownership."
            />
            <link rel="icon" href="/favicon.svg" />
            <meta
              property="og:image"
              content="https://evm.pinsave.app/PinSaveCard.png"
            />
            <meta property="og:url" content="https://evm.pinsave.app/" />
            <meta
              property="og:title"
              content="Pin Save - decentralized Pinterest"
            />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:site" content="@pinsav3" />
            <meta name="twitter:creator" content="@pfedprog" />
          </NextHead>
          <NotificationsProvider>
            <RainbowKitProvider chains={chains}>
              <LivepeerConfig client={livepeerClient}>
                <MainContext.Provider
                  value={{
                    initialiseBundlr,
                    bundlrInstance,
                    balance,
                    fetchBalance,
                  }}
                >
                  <LayoutApp>
                    <Component {...pageProps} />
                  </LayoutApp>
                </MainContext.Provider>
              </LivepeerConfig>
            </RainbowKitProvider>
          </NotificationsProvider>
        </WagmiConfig>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </MantineProvider>
  );
}

export default MyApp;

import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'DLCF Buea | Fellowship Hub',description:'Members, fellowship, academics and administration for Deeper Life Campus Fellowship, Buea.',metadataBase:new URL(process.env.APP_URL||'http://localhost:3000'),icons:{icon:'/logo.png',apple:'/icon-192.png'},manifest:'/manifest.webmanifest',openGraph:{title:'DLCF Buea | Fellowship Hub',description:'Deeper Life Campus Fellowship, Buea.',images:[{url:'/logo.png',width:174,height:180}]},twitter:{card:'summary',title:'DLCF Buea | Fellowship Hub',images:['/logo.png']}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}

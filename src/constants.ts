import { Service, Order, TerminalMessage } from './types';

export const SERVICES: Service[] = [
  {
    id: 'IG-2944-PR',
    name: 'Instagram Power Likes',
    category: 'Instagram',
    description: 'Instant engagement from high-authority accounts to trigger Explore page algorithms.',
    pricePer1k: 12.50,
    minOrder: 50,
    maxOrder: 1000000,
    speed: '10K/Day',
    retention: 'Lifetime',
    quality: 'Real Profiles w/ Stories',
    badge: 'ELITE HIVE'
  },
  {
    id: 'TT-8842-VW',
    name: 'TikTok Viral Views',
    category: 'TikTok',
    description: 'Optimized for TikTok algorithm. Instant delivery with drip-feed options.',
    pricePer1k: 0.42,
    minOrder: 100,
    maxOrder: 10000000,
    speed: '1M/Day',
    retention: 'High',
    quality: 'Monetization Safe',
    badge: 'HIGH RETENTION'
  },
  {
    id: 'YT-1022-WT',
    name: 'YouTube Watch Hours',
    category: 'YouTube',
    description: 'Real human engagement sessions designed to push channels toward monetization.',
    pricePer1k: 14.90,
    minOrder: 100,
    maxOrder: 4000,
    speed: '200h/Day',
    retention: 'Lifetime Guarantee',
    quality: 'Non-Drop',
    badge: 'MONETIZATION SAFE'
  },
  {
    id: 'X-5521-RT',
    name: 'X / Twitter Retweets',
    category: 'X',
    description: 'Spread your message globally. High-velocity reposting from verified-style accounts.',
    pricePer1k: 1.85,
    minOrder: 10,
    maxOrder: 50000,
    speed: '5K/Hour',
    retention: 'High',
    quality: 'Real Looking',
    badge: 'TRENDING MODULE'
  }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: '#BH-884210',
    serviceName: 'IG Performance Surge',
    target: '@nebula_designs',
    quantity: 10000,
    status: 'RUNNING',
    progress: 64,
    date: 'Oct 24, 2023',
    price: 125.00
  },
  {
    id: '#BH-884195',
    serviceName: 'X Engagement Wave',
    target: 'post_77218_auth',
    quantity: 5000,
    status: 'COMPLETED',
    progress: 100,
    date: 'Oct 22, 2023',
    price: 9.25
  },
  {
    id: '#BH-884182',
    serviceName: 'YT Watchtime Elite',
    target: 't.me/crypto_alpha',
    quantity: 4000,
    status: 'PENDING',
    progress: 0,
    date: 'Oct 24, 2023',
    price: 59.60
  }
];

export const MOCK_TERMINAL: TerminalMessage[] = [
  {
    id: '1',
    timestamp: '12:45:01',
    type: 'SYSTEM',
    content: 'New hive node initialized in Region-7.'
  },
  {
    id: '2',
    timestamp: '12:44:52',
    type: 'SUCCESS',
    content: 'Order #88219 fully processed.'
  },
  {
    id: '3',
    timestamp: '12:43:10',
    type: 'INFO',
    content: 'Scaling active automation for "Client_A".'
  },
  {
    id: '4',
    timestamp: '12:42:00',
    type: 'SYSTEM',
    content: 'Connection secured via elite proxy tunnel.'
  }
];

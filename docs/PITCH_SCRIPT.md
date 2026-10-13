# Founder pitch script

About 90 seconds at a conversational pace. Record yourself; adapt any phrasing
that doesn't sound like you. This is separate from the product demonstration.

Hi, I'm Ajnas, a software engineer and the builder of LastWei.

LastWei started with a frustrating question: why is getting a tiny amount of usable
ETH so difficult when you're just trying to finish one transaction?

A user may have almost enough for a payment, but the usual solution is to leave the
app, visit an exchange, buy more crypto, and return. That's a lot of work for a small
shortfall.

LastWei lets a sponsor fund exactly the missing amount for one authorized action.
The user signs the destination, payment value, calldata, nonce, and deadline.
A dedicated account locks both contributions to that request. A relayer pays
execution gas. If the action fails, the funds stay protected. If it expires, the
sponsor can recover its contribution.

I've built a Base Sepolia prototype with a live checkout demo, verifiable transaction
receipts, and tests covering replay attacks, reentrancy, failed execution, and refunds.

My first customers would be merchants, dApp developers, and communities helping users
complete their first paid action. The next step is testing whether this improves
checkout completion enough for those sponsors to pay for an SDK.

LastWei is an open-source, unaudited testnet prototype. The goal is simple: help users
finish the action.

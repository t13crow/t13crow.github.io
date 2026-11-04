---
layout: article
title: "The Anatomy of a Bulletproof Hoster: A Data-Driven Reconstruction of Media Land"

description: "A data-driven reconstruction of the bulletproof hosting provider Media Land, using leaked internal records to analyze customer structure, address space allocation, and links to ransomware activity."
excerpt: "Using leaked internal data, this post reconstructs how the sanctioned bulletproof hoster Media Land organized users, subscriptions, and address space, revealing supply-chain links to ransomware operations."

tags:
  - Research Progress
  - Observations on Threat Intelligence

author: Max van der Horst
mathjax: true
mathjax_autoNumber: true

show_author_profile: true
show_edit_on_github: false

header:
  theme: dark
article_header:
  type: overlay
show_tags: false
---

> **Summary:**
> This post uses the leaked internal database of Media Land, a sanctioned bulletproof hosting provider, to reconstruct how its platform organised customers, subscriptions, virtual machines, and IP address space across billing, compute, and network layers. By rebuilding the schema locally and pivoting on stable identifiers such as user IDs, SSH keys, and payment records, it derives operational profiles and highlights clusters of accounts that behave like resellers in terms of subscriptions, address allocations, and cryptocurrency payments. The same internal IP assignment history is then cross-referenced with public indicators linked to the Black Basta ransomware group, producing a set of 74 Media Land customer accounts that at some point managed IPs later mentioned in the Black Basta leak, including one large reseller-style account. While this does not attribute specific individuals, it shows how internal hosting records can illuminate the supply chain that underpins ransomware operations and support more structural forms of threat intelligence.


On 28 March 2025, internal data from Media Land, a hosting provider repeatedly linked to bulletproof services, was [leaked online](https://cyberpress.org/threat-actor-exposes-data/). The material first appeared on Telegram and was later referenced by public reporting, exposing information about Media Land's backend systems and the infrastructure used to facilitate cybercrime activities. [According to PRODAFT](https://x.com/PRODAFT/status/1909342469617053720), the leaked data contains information about server purchases, financial transactions, payment methods (including cryptocurrency), and some personally identifiable information of Media Land's users. Half a year later, on 19 November 2025, the UK, US, and Australia [announced](https://www.gov.uk/government/news/uk-smashes-russian-cybercrime-networks-responsible-for-attacks-on-uk-businesses) new sanctions targeting Media Land. The announcement explicitly referenced the role of resilient hosting infrastructures in enabling large scale attacks on European businesses.

This post uses the leaked Media Land dataset to give a data-driven reconstruction of how a bulletproof hoster is organised. By rebuilding the database structures and analysing subscription records, instance histories, and IP allocation logs, we can map structural patterns in the platform's operations. These patterns include the separation of core infrastructure and customer infrastructure, distinctive behavioural profiles, such as large-volume address consumers and unusually large payments originating from single accounts. 

In what follows, I first reconstruct how Media Land's internal systems fit together as a hosting platform. This is an interesting insight in itself. Then, I look at how different customer segments used that infrastructure in practice, before finally linking internal records to external indicators of compromise, focusing on Black Basta.

The objective is to show how bulletproof hosting infrastructures organise, allocate, and recycle address space. Additionally, this post aims to explore how this type of leak can be used for threat intelligence by cross-referencing and pivoting into previously observed abuse indicators.

# Contents of the Media Land Leak
If table-level details are not your thing, you can safely skim this section and jump ahead to "Reconstructing Customer Activity and Resource Allocation", where I focus on behavioural patterns.

The Media Land leak provides a rare internal view into how a criminal (monolithic) hosting platform handles its internal registration over time. Rather than being a single snapshot, several tables record longitudinal history, which lets us reconstruct lifecycle patterns and infrastructure use as well.

At a high level, the leak spans three layers:
* **Customer and billing layer:** who the platform considered a customer, what they bought, and whether those purchases were active or cancelled. Here, Media Land's incomplete customer tracking already shows a clear lack of Know Your Customer processes.
* **Compute and service layer:** what virtual instances existed, how they changed state, and which users controlled them.
* **Network layer:** which IP addresses were assigned, when, and to whom, including both IPv4 and IPv6 ranges.

The most operationally useful part is that these layers are linkable by stable identifiers. This makes it possible to pivot from a user account to subscriptions, from subscriptions to assigned IP space, and from those IPs to observed operational behaviour over time. 

## Tables in Scope
The leak contains a coherent snapshot of the internal data model used by Media Land's hosting platform. The exposed tables fall into several functional domains that together describe users, subscriptions, virtual infrastructure, IP allocations and billing activity across PostgreSQL, MySQL, VMManager, IPMI, VXLAN, KVM, Libvirt, and Ceph. Although each table on its own is limited, the combination provides a nearly complete view of how customers, servers, and addresses are linked inside the platform. This section describes what each group represents and how they fit together. 

![](../../../assets/medialand_overview.png)
<span class="centered-text">Figure 1: Overview of the Media Land database leak</span>

### User and Account Records
The platform distinguishes between two concepts that behave like "user accounts". The *user_user* table stores the identity of real human customers for as far as they fill in accurate details, while *vm_account* contains the operational accounts that interact with the virtual infrastructure. In practice, these two usually belong to the same person and share the same identifier, but they appear in different tables because infrastructure operations and billing operations are handled by separate subsystems. Both tables ultimately link into billing, network assignments, and virtual machine activity. 

### Billing and Payment Data
A cluster of billing tables records how customers subscribe to virtual machines, how renewals occur, and which payments were issued. The central element is *billing_subscription*, which ties users to active or cancelled services, often paid for in Russian Rubles. Related tables track add-ons, balance adjustments, and historical actions. One notable table is *billing_bitcoin_payment*, which confirms that Media Land supported cryptocurrency payments and used price and amount tracking fields rather than a simple "paid or not paid" flag. This makes the billing system an important source of behavioural information, because subscription patterns and payment histories correlate strongly with reseller activity. 

### Virtual Machine Lifecycle and Provisioning
The provisioning subsystem consists of tables that represent virtual machines and their state changes. The table *hosting_instance* stores the current state of a VM, while *hosting_instance_history* records every creation, deletion, and migration event. The *hosting_instance_issues* table contains operational faults such as failed provisioning or host-level errors. Together, these tables document how customers interacted with the platform: how many VMs they deployed, how often they recycled them, and whether they were running high-churn infrastructure.

### Host Nodes and Assigned IP Addresses
The infrastructure layer covers the physical or virtual host nodes and the addresses routed to them. The *vm_host* table lists the compute nodes that run customer VMs. *vm_ip* represents individual addresses assigned on those nodes, including their address, IP family, and the account to which they were bound. This layer sits closest to the boundary between customer behaviour and internal operations, because it reflects real resource consumption and routing-level behaviour. 

### Network Assignment and IP History
The network subsystem manages how IP addresses and prefixes move between users and virtual machines. The most important table here is *network_ip_history*, which logs every address assignment with timestamps, assignment type, and associated VM or subscription. This table provides a historical record of how the address space was used over time and is one of the strongest indicators of reseller behaviour. A smaller table, *network_customer_prefix*, records IPv4 or IPv6 prefixes delegated to specific customers.

### Administrative Controls and Internal Operations
The leak also exposed a small set of administrative tables that reveal how Media Land structured internal access and oversight. These include the admin accounts themselves, some credentials, their roles and associated permissions, and a login history that records when staff accessed management interfaces. They instead act as a map of Media Land’s internal control surface, showing which administrator accounts existed, what privileges they were assigned, and how often they logged in. This information does not necessarily indicate malicious intent, but it provides valuable context for understanding the separation between operational automation and human intervention inside the platform.

# Putting Together the Infrastructure
The Media Land leak exposes a fully integrated hosting platform where authentication, billing, compute orchestration, and network provisioning operate as one tightly coupled system. The tables show how each subsystem feeds the next. User records link directly into subscriptions, subscriptions trigger virtual machine provisioning, and provisioning events produce IP allocations that appear in the network history. This creates a clear end-to-end chain from customer identity to infrastructure footprint.

Several architectural patterns stand out. Media Land separates human-facing accounts from infrastructure-facing accounts, yet both feed into the same subscription and network assignment logic. Billing events act as the operational trigger for most downstream activity. The compute subsystem is structured around lifecycle events rather than a static configuration record, which suggests that provisioning and instance management relied heavily on automated workflows. The network subsystem captures every address assignment in granular detail, which makes it possible to reconstruct how blocks were used and how often they moved between customers. 

The presence of VXLAN overlays, saga workers, and IPMI references points to a modern orchestration stack built around asynchronous tasks and network virtualization. The MySQL side of the leak confirms that the platform handled both customer-visible resources and underlying host node coordination. This design resembles a compact, self-hosted cloud environment rather than a simple VPS reseller panel. That structure matters, because it gives us an end-to-end path from "who is the customer?" to "which IPs did they actually use, and when?". This is what I turn to next.

## Address Space and External Routing Context
The infrastructure layer also reveals how Media Land organised and utilised its public IP space. The leaked data shows that customers were provisioned with addresses drawn from a small but distinct collection of IPv4 and IPv6 ranges:

IPv4
* `45.141.84.0/24`
* `45.141.85.0/24`
* `45.141.86.0/24`
* `45.141.87.0/24`
* `91.220.163.0/24`
* `91.240.242.0/24`
* `194.26.29.0/24`
* `194.26.69.0/24`
* `77.221.134.0/24`

IPv6
* `2a0b:7ec0:1320::/48`
* `2a0b:7ec0:533::/48`

Important to note is that the range `91.240.242.0/24` is registered as being used by customers in *network_ip_history*, but has since been reallocated to *sevencloud.ru*. Therefore, this could show up in the leak but is no longer part of the Media Land infrastructure. Moreover, the range `77.221.134.0/24` is listed internally as *NL Subnet*, which checks out as it is part of a sister company called *ML Cloud Ltd* and geolocates to the Netherlands instead of Russia. The *vm_host_log* table suggests that this subnet is used for customer-facing hypervisor pools. For as far as Media Land still owns the prefixes, all of these ranges are announced under AS206728. 

These blocks account for every address observed in the leak, all originating from AS206728 and AS215376. The IP allocation behaviour shows that these prefixes were treated as a shared pool available to many users at the same time, rather than as dedicated ranges tied to individual customers. These ranges can therefore be monitored in passive DNS, BGP announcements, and future threat intelligence feeds to track the re-emergence of related infrastructure.

# Reconstructing Customer Activity and Resource Allocation
The structure of the leaked data makes it possible to follow a customer from initial signup to full infrastructure usage. Each user in *auth_user* or *vm_account* spawns one or more subscriptions. These subscriptions then act as the source for all provisioning activity. Customers with a large number of subscriptions often show up as heavy users of instance history, IP allocation, and prefix movements. In other words, we can move from a static picture of tables to a dynamic view of how different kinds of customers actually used the platform over time.

The *hosting_instance_history* table, as mentioned, logs every creation event, deletion, migration, or restart. By grouping these records by *user_id*, patterns can be derived that differentiate casual customers from high-volume renters. Some users create only one or two machines, others create thousands, often within tightly clustered time windows, which is typical of either automation or panel reselling activity. Instance events correlate strongly with IP allocation patterns in *network_ip_history*, where the same users accumulate large numbers of addresses across a small number of parent blocks. 

Resource allocation becomes especially visible when following the lifecycle of an IP. Every address in *network_ip_history* includes the user, subscription, entity type, and assignment event. By aggregating these assignments, it becomes possible to identify users who consistently draw from the same small set of IPv4 /24s or IPv6 /48s. Some of these patterns reflect normal internal pooling, while others indicate users who received unusually continuous portions of the same parent ranges, which suggests structured access rather than random allocation (in line with reseller structures). 

The combined compute and network perspective reveals three distinct customer types:
* **Allocators:** a small group that receives a wide spread or parent blocks, often at higher levels of exclusivity.
* **Shared-pool heavy users:** a larger group that receives many IP addresses but almost always from the same four parent ranges.
* **Typical customers:** users with small numbers of subscriptions and instance events.

This division does not confirm reseller activity on its own but it highlights operational segments that behave differently inside the platform. Additionally, the allocator group may as well consist of internal testing, as the subscription IDs for the allocators show a high volume of services for which none are paid. The state of these services consistently display a *canceled* state.

By reconstructing these flows across subscriptions, histories, and network events, the leak allows a detailed look into how Media Land allocated resources and how specific customers used them. The observable patterns and volatility align with the known behaviour of infrastructure used for frequently replaced operations such as malware distribution, phishing, or command and control nodes. Interpretation, however, requires caution and should remain grounded in structural evidence rather than speculation. 

# Operational Indicators and Threat-Intelligence Value
The structural reconstruction of Media Land's systems is useful for understanding how the platform functioned internally, but the leak also offers practical intelligence that can support ongoing detection efforts. Up to this point, the focus has been on what the leak tells us about Media Land itself. From here on, I use the same data to extract operational indicators that can support threat hunting and attribution work. Because the data spans user activity, instance lifecycles, and entire IP-assignment history, it enables the extraction of stable behavioural patterns that extend beyond the specific IP ranges and ASNs currently associated with Media Land. 

The following sections will dive into the data to do some analysis with the goal of linking Media Land users to observed abuse.

## Preparing the Data for Analysis
Before talking about specific findings, it is worth briefly outlining how I turned the raw dump into something I could analyse. As shown in Figure 1, the raw dump spans multiple subsystems: billing, lifecycle management, network assignments, authentication, and each uses its own timestamp formats, identifiers, and schemas. To find more patterns, the individual subsystems can be programmatically referenced using the identifiers (representative for the edges in Figure 1). In particular, the user identifiers reoccur in various different places. This will allow us to build profiles.

All tables in the PostgreSQL were rebuilt using `pg_restore` program, allowing for a locally hosted version of the databases. All tables were then loaded into a Jupyter notebook as Pandas dataframes. Identifier columns (*user_id*, *subscription_id*) were cast to string to ensure table-stable joins, and temporal fields like start and end datetimes were unified to timezone-aware UTC. 

Columns were harmonised based on semantic equivalence (such as *created_at*, *registered_at*, or *date_joined* all representing account creation) so that downstream logic could operate on normalized fields.

## Profile Construction
To make sense of individual user behaviours, the normalised data was consolidated into Markdown *profiles*. Each profile captures information linked to a given user identifier:
* Email addresses
* Password hashes
* SSH public keys
* Bitcoin transactions
* Full IP-assignment history

The logic is straightforward: start at the user id, pivot to the *user_user* table and locate the account tied to the user id, then do the same for any cryptocurrency billing, virtual machines, and IP assignments. This allows us to read the dataset not as a collection of tables, but as longitudinal traces of individual resource users.

![](../../../assets/profile_overview_medialand.png)
<span class="centered-text">Figure 2: Example profile rebuilt from the Media Land leak</span>

# Findings From User and Infrastructure Behaviour
With the profiles in place, we can finally look at how different actors behaved inside Media Land’s infrastructure: who used large amounts of IP space, how email and payment patterns clustered, and where SSH key reuse ties seemingly separate accounts together. These findings are of course not claims about intent, but observations about how infrastructure was used within the platform. For the same reason, I will not include any full email addresses and PII in this post but will partially redact them instead. The full details remain confined to the research environment.

|---
| user_id                              | email                              |   ssh_keys |   uniq_ips | BTC payments |
|:-|:-|:-|-:|-:|  
| 93ad06b4-c186-431e-82d2-33ac2fad4e62 | pra\*\*\*\*\*\*90@gmail.com              |          1 |       1213 | 1
| 8c22c958-bbc6-4dd8-b7b8-c64506a754ff | zah\*\*\*\*\*\*@gmail.com                |          2 |       1201 | 10
| e5249019-ce0f-43d0-8b2d-a5f1a68d5265 | ait\*\*\*\*\*\*@gmail.com                |          1 |       1122 | 2
| be6f972d-54e1-49c5-9710-38f42ef8a58d | faz\*\*\*\*\*\*hir@gmail.com             |          2 |       1102 | 4
| b122f10a-6cc6-4a2f-a7e5-3d980d581eac | sen\*\*\*\*\*\*h@gmail.com               |          2 |       1070 | 2
| 87b7b188-f67f-48b4-8e35-76488896f8e8 | mon\*\*\*\*\*\*a@gmail.com               |          3 |       1003 | 0
|---

<span class="centered-text">Listing 1: Example information about accounts</span>

## Email Address and Password Patterns
Most accounts had hashed passwords tied to them, but the surrounding metadata reveals repeated patterns of throwaway email providers, multiple user IDs controlled through the same email address, some addresses linked to tens of subscriptions and hundreds of IP assignments, or even a case of password re-use. When combining email clustering with SSH keys, BTC payments, and IP (re)allocation, specific operational clusters can be discovered: isolated groups of accounts that share provisioning patterns, payment patterns, SSH keys, and display handover coordination through resource reallocation. These clusters do not necessarily correspond to individuals, but they possibly represent operational entities inside Media Land's infrastructure. 


|---
| user_id | email | password_hash | name | created_at |
|-|:-|:-:|-:|-
| 1f2ae72c-de28-47b9-8be0-f5026cd48c23 | te\*\*\*\*\*\*\*\*\*\*\*om@protonmail.com | `$2b$13$sDurL1.0/9QlBOCsIjVLr.Xn********************kdXGiTDRL` | NaN | 2024-07-08 16:43:22.662 
| 8f728d4a-687e-4aea-bd8d-b44256f5b30c | gr\*\*\*\*\*\*sov@mail.ru | `$2b$13$sDurL1.0/9QlBOCsIjVLr.Xn********************kdXGiTDRL` | Мистер Ресселер | 2021-12-29 21:05:35.504 
|---

<span class="centered-text">Listing 2: Single case of password reuse across accounts</span>

As listed above, there was a single case of password reuse, leading to the discovery of another account that was created nearly three years prior. Now, of course it is possible that people use the same passwords. However, with 1666 total observed users, it is unlikely, which means we could consider these two accounts as potentially belonging to the same person. Interestingly, the name this person has given to the account is Мистер Ресселер, translating to "Mister Reseller". 

Additionally, there was a high degree of (disposable) email (re)use. Examples of recurring domains are:
* emailbbox.pro
* emailcbox.pro
* emaildbox.pro
* emailfoxi.pro
* linshiyouxiang.net
* tempmailto.org

For most of these throwaway emails, there is only a single subscription for 250 RUB that is deleted after some time. However, there is also one email address that has 40 accounts attached to it by numbering accounts. As such, there is a list of users with email addresses like:
* mvm*****1+1@gmail.com
* mvm*****1+2@gmail.com
* mvm*****1+58@gmail.com
* mvm*****1+1@mail.ru
* mvm*****1+54@mail.ru

These accounts also contain a significant number of Bitcoin payments, showing 12 payments amounting to a total of ~34.08 Bitcoin (which, taken into account registered BTC values at the moment of the transaction, makes a total of RUB 44,494,110.00, or EUR 488.824,31) paid to Media Land between July and October 2022 by this entity, each time with a different BTC address. While not conclusive, the payment amounts, number of IP assignments, and number of accounts suggest that this could be a reseller brokering access to Media Land infrastructure. Following the transactions does not seem to lead to a clear BTC address associated with Media Land and there were no users found that used the same Bitcoin address to make payments.

|---
| email | payment code | address | amount (fiat) | bitcoin_price_value | bitcoin_amount_value | status | created_at
|-|:-|:-:|:-:|:-:|:-|:-|-:|
| mvm*****1+58@gmail.com | PMTvc3e4NQX4v45NAXpaG2Yq44NJ8MpCSeXNh6wnBYrSpcTxQcTfK | 32MeTrsYDKdMvFo8kLS45xd6o5JDCb666R | RUB 12000.0 | RUB 1404780.40 | 0.008542  | CONFIRM | 2022-07-08 17:05:10.733 |
| mvm*****1+24@gmail.com | PMTv4acx5euFy97KpERK1G4nitVbMyzmfrwL332dcnmdq6seZMjQu | 3MNoaJjBZ4yRutatQZX2s9r8LmyshrTMCc | RUB 35500.0 | RUB 1290603.46 | 0.027507 | CONFIRM | 2022-08-25 00:55:07.227 |
|---

<span class="centered-text">Listing 3: Example transactions</span>

## (Automatically Generated) SSH Keys
Users that had made a purchase often also had an SSH key associated with this machine. These were either SSH keys uploaded by the users themselves or keys that were automatically generated. The automatically generated keys follow the same naming convention and include the day they were generated:

|---
| email | comment | key | 
|-|:-|:-|
| ant\*\*\*\*\*\*\*dinov@sshvps.net | ssh-vps-\*\*\*\*dinov | `ssh-rsa AAAAB3NzaC1yc2EAAAABJQAAAQEAoFZcPJ+gM01bnjuD3tZZGDWKAbjL+er6QpOs9W6SG7jp9rGp22X5aKnKVmnC6ENpDzOPveKAS5FPnWOmMLhBoSHZM7Q3+1S6YB+Kq+XrHHKcQ04sdFjH2rCn5o7cvy0U1Rit73aD5NSLMyxi5/NEXkQnQVNegBQeNDZdJuSFQ9hWXS8RFrXgtMoXspTnyq+wNywaS/gz8MTP9WJVq+WLT4pjdBA2sBKawtF3gGcEZ4clov5xnL4E9n2I572pyFOiESBim9aYEY5hKQlcCLBKcVS2QCd8z3Ny0rIckA1pziB+wQgmFoENsTax4EbWjdecAWhN0mwTjREz+6yf2KEMiw== rsa-key-20221011`
| mju\*\*\*\*erro@gmail.com | ead | `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDTKSnbaptHMi8NoFo9mgSjEFq8kp01n5rPUatkFyGsfdY8EELwWzs84nUshvDReeXZcXqu1sSio7cXls2UHPsoQaPm8jBI0GxM7oq2apm7yIE1QswmbL0R02IO4iTM6RR131Q2czDa8fTRcYAe8cdG3ZZkUkNAn1di9UJadeLlHeR4AA9fQDLEU0Q2WLCPpmgXKzLylnoOWXR2CYIfRLqyPrq8TfcbMwKXAiUcE7i5NFg7aTCMfz5JQQfpisSY4o9iLmtx8dp3jzl7xQtu+avGgTAz7nTv9N45N6fvxbgQKuo+KUScZA1IEYI2aagq0wzDIgM/SPyw+sh49NU3klB9 rsa-key-20240725`
| roc\*\*\*\*phin@ex.ua | 1 | `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCN8EVkuuMcmcb0o+Mi8mZWNMLOEgnNWkzfp+e89W9fh6uGGALR7AuvZK4s7t/0LxZVHe2hqm1YL6PiSkGtAlHCCwDaXEwl+35DBO+l/WZlxarFZoRpuy3fmWAIsqE+ReDHOCOGv1bB18cpfyg2pL4fMDGDe/6pcHJFG0G+6Z+e3oPCDtWzvlfDGPFMpSEmbspjpwW5v28VkSf0kPkXOi1M4SZBKcEhQIfik6mCIzSb47OGSjk8tk566uUOvapLZb2EwzGxn4ZBJaFFQnG+SOxgFpmtitniz59GyMJ+5R6nd226xS8XKYgUPMI5z5vs+qwgAOGq79uHSg16g9Kt1myb rsa-key-20220214` 
| mvm\*\*\*\*\*1+2209@gmail.com | Пользователь Старый | `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDrWJQojQB7rUOpiyDEdsAUva0o/c2T6Kx4AQvbDEq3Awo2+yJ4TmWw9n24u0XH8c3UYzQUoO+UM+Vh0Klg7p4SpAvkbKFtmj1bs9T6fwX5Pesh4BryFrpW6zGctsmOlJ8Ns/XWG0PUUtBFlByJrBloa1Trn0xJqo8nUO07m5NNl96vSje3m/2PysqRcW4y189+JRgT1uIcejHjBQsGQqbwpz47WK89AODSgY3ssrYgjRdoEz7FD1BUCzW8l9gWoXK4xoNmrgIbXqFsDT8a7yq4LpLxMMZ2Q5UwLO4jAd2SG7XzddPk/tOtAb+Im9OkL0l277HeGx/jupOCsT+vz2fzkSBjtGjuFS0oJC6LFJeeEGP6gHbnjP45VumYnSo7pgWa/uWswz8buuchieUKT3X92dXbNGO8h1mpuOgkzGz55zI5DY6405YW0g5waJocvAQQRs6oF/v5VcktIEHGg9Dn+44vfxbafu6ESijfVTm72sL6irp5shnNm2X06xuS5LE= valentina@valentina-ubuntu`
|mvm\*\*\*\*\*1+4@gmail.com | нннн | `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDrWJQojQB7rUOpiyDEdsAUva0o/c2T6Kx4AQvbDEq3Awo2+yJ4TmWw9n24u0XH8c3UYzQUoO+UM+Vh0Klg7p4SpAvkbKFtmj1bs9T6fwX5Pesh4BryFrpW6zGctsmOlJ8Ns/XWG0PUUtBFlByJrBloa1Trn0xJqo8nUO07m5NNl96vSje3m/2PysqRcW4y189+JRgT1uIcejHjBQsGQqbwpz47WK89AODSgY3ssrYgjRdoEz7FD1BUCzW8l9gWoXK4xoNmrgIbXqFsDT8a7yq4LpLxMMZ2Q5UwLO4jAd2SG7XzddPk/tOtAb+Im9OkL0l277HeGx/jupOCsT+vz2fzkSBjtGjuFS0oJC6LFJeeEGP6gHbnjP45VumYnSo7pgWa/uWswz8buuchieUKT3X92dXbNGO8h1mpuOgkzGz55zI5DY6405YW0g5waJocvAQQRs6oF/v5VcktIEHGg9Dn+44vfxbafu6ESijfVTm72sL6irp5shnNm2X06xuS5LE= mvmpp@LAPTOP-9M7611VJ`
|---

<span class="centered-text">Listing 4: SSH key reuse throughout the leak</span>

Similarly, the earlier discussed account used the same naming conventions over various keys, allowing further tracking of related accounts by using the key name as a pivot point. Comments for such keys include phrases like *Пользователь Старый*, which translates to *Old User*. Where the key name `mvmpp@LAPTOP-9M7611VJ` is quite anonymous, `valentina@valentina-ubuntu` gives away more information. 

Using the SSH keys as a pivot point, there were 344 unique SSH keys of which 4 keys could be used to cluster multiple accounts together:

|---
| cluster | emails | key | 
|-|:-|:-|
| 1 | 14\*\*\*\*u5@comparisions.net, fe\*\*\*\*\*o@linshiyouxiang.net | `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCrCEG74WDUJsaCtN/8y9/YIneh3MKgVugC/nG61diMurea3QFOuA1yWxDIWkWgXj0jz9Tz6XnQv8laBu28hAAS2hJJlFRpK8h6gFY9Wg6DheG1LIl18tVg/07keaCrqbFIP6VOcJe+mUAdUbDHF4Dt5Turc008X4V0JML0LqAWPV9WLfXvBJnTNzV/fkTJQKDCIgXDLxII3uav9VD/hmIyXmAJBTfJG+s3eXOn7zthCyVhXzfzK6KiEduAp/Zmkf0JYUQy9pFrTFq37lleAHbcRjmLVzvaga/PDDOXQr7gc9qGrNhLsycg6iM49nO1j30YEBturtcBwQzamBoLpXwbs0Ap1bwsRsFbgIYvtuxejxnXy7fkUms2Mp140VvBCGAQll3o63oMLj5yNVw2aXUK3ay3IS29e15w8zJAJjggEUQAEZqwBt1Na3MwPkHiZ256UKVg4F4UiJCxZMogXruoKm+OajMLdlTgLDOsXqhoLcvrf+Q331d1ekDj3MfkN7c= administrator@PC-202207021402`
| 2 | Cluster of 17 accounts, example: ait\*\*\*\*\*8@gmail.com, faz\*\*\*\*\*\*\*\*r@gmail.com, server\*\*\*\*\*\*7@gmail.com | `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDBVAxj75sjjDnExWoIfbK24HIEcwiEQtx4HujnbTgHEdJJwZGyiOj9iombEIUkaLzdKVmSI6bp0iG+onRINM+SAxJtZk6e8zQElygyE8whQnjdpQXm3xvE+8pOVG67whE+tSXUsLV5lj7Y8JUdcDSd2JN0aZH4bCCHwQ9kawwvRL04cKjHS2HfTWVgPuoLQLUxu9bIODCR/9WkmY4Pmgi6NJ6F2wT1nuShE+2+XJXtYquGpcXyIZV2SBxHPZMxab0kz/XfSW+Jq6csZoEd88pVdKGrVsNnveuM7OxMb5XTL58XTAscnZ4VJfHoiVa2Ohw3KojojfleizICA6XHqeOOqIZBzg6WVVmNeYy5CZHnyW65syAjFZJA9j3uMhCE7NpkeaQ8jxiSX4vEEcVcBnSUXviWVAMfWHbI6z/jll5mXmZLHXkz7+JWNM+4pT6PS0UMOZNvv+xuTP5DB6bVBgoGu0S926HW/V75oy+yRwgYAd6Z71HTTVX06tPjbY+q9QiBpK/DhKvEAWGU8WMW/pP4ReZXaihNV7XyM+F1NccjMT+9XyhSKwNpUrNHOruHW6QlEa//VqviDT2WeQuMMl0rrSMMNNQxT0pOLEUmypqOagwYk5IRxhOC6d6/AYHxzR+2uVhe17V4ow1P2XWS2qvOI6eKmopU38WOiEsnSfq8NQ== trans@E-matrex`
| 3 | mvm\*\*\*\*\*1+<number>@gmail.com | Earlier mentioned `mvmpp@LAPTOP-9M7611VJ` key
| 4 | mvm\*\*\*\*\*1+2009@gmail.com, mvm\*\*\*\*\*1+2209@gmail.com | Earlier mentioned `valentina@valentina-ubuntu` key
|---

<span class="centered-text">Listing 5: SSH key reuse clusters</span>

This type of clustering helps discover the scale of the infrastructure that some of these accounts are managing. Cluster 2, for example, has a total IP assignment of 8661 IP addresses over two years. Knowing that SSH public keys are reused on this infrastructure is useful, as [recent research](https://www.usenix.org/conference/usenixsecurity25/presentation/munteanu) has shown that these public keys can be scanned for. This may allow us to discover new criminal infrastructure in the long run. 

# Hunting Black Basta
So far, I have stayed inside the boundaries of the Media Land leak itself. To understand how this infrastructure was actually used in the wild, I cross-referenced the internal IP-assignment history with publicly known indicators of compromise. For this first pass, I focused on infrastructure linked to the Black Basta ransomware group. The sanctions mentioned in the introduction describe that Media Land is accused of facilitating both the Lockbit and Black Basta ransomware group, and Black Basta had a [leak of their own](https://www.trellix.com/blogs/research/analysis-of-black-basta-ransomware-chat-leaks/) in February 2025, providing access to over 200,000 internal messages. Researchers earlier processed these messages to extract all the relevant information (among which all mentioned IP addresses), noting that the timeline of the leak is between September 2023 and 2024. 

## Method: from IOC list to Media Land users
The Black Basta indicators are available through [VirusTotal](https://www.virustotal.com/gui/collection/4e6f6cbc3b769747ddc749d52ee980119af2ef30ad48c5f216638a3fa2602081/iocs). For this analysis, I downloaded the IP addresses extracted from this leak and filtered it to IPv4 addresses. Using Python, and after loading the IPs, two simple functions help link IP addresses to users and vice versa. 

```python
"""
Two functions pivoting through the Media Land leak, using the user_user, network_ip,
and network_ip_history tables. Assumes that `network_history` contains one row per
assignment interval with normalised start_at/end_at timestamps (UTC).
"""
def who_had_ip_at(ip, t, intervals=network_history):
    t = pd.to_datetime(t, utc=True)

    sub = intervals[intervals["host_ip"] == ip]

    active = sub[
        (sub["start_at"] <= t) &
        (sub["end_at"].isna() | (sub["end_at"] > t))
    ]

    cols = ["host_ip", "address", "user_id", "subscription_id",
            "start_at", "end_at", "assignment_type", "assignment_id"]
    cols = [c for c in cols if c in active.columns]

    return active[cols].reset_index(drop=True)

def what_ips_user_had_at(user_id: str, t: Union[str, pd.Timestamp], intervals=network_history):
    t = pd.to_datetime(t, utc=True)
    sub = intervals[intervals["user_id"] == user_id]

    active = sub[
        (sub["start_at"] <= t) &
        (sub["end_at"].isna() | (sub["end_at"] > t))
    ]

    cols = ["user_id", "address", "subscription_id", "start_at", "end_at",
            "assignment_type", "ip_entity", "assignment_id"]
    cols = [c for c in cols if c in active.columns]

    return active[cols].reset_index(drop=True)
```

<span class="centered-text">Listing 6: Functions to pivot in the Media Land leak</span>

For the function `what_ips_user_had_at()`, a date is obviously good to have. Luckily, we know that the Black Basta messages were sent between September '23 and September '24. Using the two functions in Listing 6, we could test single IP addresses. By executing `who_had_ip_at("194.26.25.111", "2024")`, the function returns two users:

|---
| host_ip | user_id | email | start_at | end_at |
|-|:-|:-|:-|
| 194.26.25.111 | 8f728d4a-687e-4aea-bd8d-b44256f5b30c | gr\*\*\*\*\*\*sov@mail.ru | 2024-06-23 13:03:10.129669+00:00 | NaN |
| 194.26.25.111 | dfa89b88-7d98-4e57-a3c1-785a8e78c1f0 | an\*\*\*\*\*\*\*\*\*\*\*\*\*\*nesm@gmail.com | 2023-12-08 08:47:40.070893+00:00 | 2024-06-23 13:03:10.129669+00:00 |
|---

<span class="centered-text">Listing 7: Looking up single IP address from VirusTotal collection</span>

One of these accounts we have seen before! It is Mister Reseller, whom we found trying to pivot for password reuse! When we look in the profiles we generated earlier, Mister Reseller had 1902 unique IP assignments on this account with the aforementioned ~8.5 BTC in payments. This user also has an explosive number of subscriptions on his account. That is significant, so the next part is about counting which users relate to the Black Basta indicators.

![](../../../assets/profile_blackbasta.png)
<span class="centered-text">Figure 3: Found profile connected to Black Basta indicators</span>

## Enumerating all accounts that managed Black Basta indicators
With the `what_ips_user_had_at()` and `who_had_ip_at()` functions, we can scale to count the number of users that (and more importantly, what users) managed an IP address related to Black Basta between September 2023 and September 2024. Now, as we are looking at a hoster, it is plausible that these users are sharing an IP address due to, for example, shared hosting. According to Media Land's registration, however, these are all rented Virtual Machines with their own IP address. According to *network_ip_history*, each of the Black Basta-related IPs appears to be assigned to a single user_id at any point in time, with no overlapping assignments in the leak.

```python
def count_ioc_ips_per_user_2024(
    ioc_df: pd.DataFrame,
    network_hist_df: pd.DataFrame,
    users_df: pd.DataFrame | None = None
) -> pd.DataFrame:

    # Assuming ioc_df has a colunn "ip"
    ioc_ips = set(ioc_df.astype(str).str.strip())

    df = network_hist_df.copy()
    df["start_at"] = pd.to_datetime(df["start_at"], errors="coerce", utc=True)
    df["end_at"]   = pd.to_datetime(df["end_at"],   errors="coerce", utc=True)
    df["end_at_filled"] = df["end_at"].fillna(pd.Timestamp.max.tz_localize("UTC"))

    df["ip_only"] = df["address"].apply(strip_ip)
    df = df[df["ip_only"].isin(ioc_ips)]

    start = pd.Timestamp("2023-09-01T00:00:00Z")
    end   = pd.Timestamp("2024-09-01T00:00:00Z")
    df = df[(df["start_at"] < end) & (df["end_at_filled"] > start)]

    if df.empty:
        return pd.DataFrame()

    counts = (
        df[["user_id", "ip_only"]]
        .dropna()
        .drop_duplicates()
        .groupby("user_id")["ip_only"]
        .nunique()
        .reset_index(name="n_ioc_ips_2024")
        .sort_values("n_ioc_ips_2024", ascending=False)
    )

    if users_df is not None:
        counts = counts.merge(
            users_df[["id", "email"]].rename(columns={"id": "user_id"}),
            on="user_id",
            how="left",
        )

    return counts
```

<span class="centered-text">Listing 8: Enumerating users associated with the IP addresses mentioned by Black Basta in their leaks</span>

|---
| user_id | bb_ips_sept_2324 | email |
|-|:-|:-|:-|
| 8f728d4a-687e-4aea-bd8d-b44256f5b30c | 207|            gr*****sov@mail.ru |
| 49b144f3-2648-4598-b7c3-c8a9bb42e60c | 62 |     yash**********5@gmail.com |
| dfa89b88-7d98-4e57-a3c1-785a8e78c1f0 | 36 | anton*************m@gmail.com |
| 40e151cc-121f-4f90-bbfd-4e819c4e144a | 27 |    anto***********3@proton.me |
| 2deb1533-552e-409b-bd90-d59fb1c0a706 | 25 |            pa*****t@gmail.com |
| 303a9cbe-5c15-4329-bd0e-0f600769408d | 21 |   zhou************@gamail.com |
| ef0e1ba8-8323-4cd6-b2a2-194cd488052e | 20 |  chern************3@gmail.com |
| 67f41c34-1dbe-4747-a304-08ff2ad75429 | 18 |     jea***********s@gmail.com |
| 30346179-3b8a-4c72-9120-9f8d64f3c74d | 18 |      mur**********outlook.com |
| 2c04a9e3-499d-4a42-b415-12223586531e | 17 |       luci********4@proton.me |
|---

<span class="centered-text">Listing 9: Top 10 users associated with Black Basta IP addresses between September '23 and '24</span>

Of course, this does not immediately mean that we found all the Black Basta criminals and can now send them emails. In total, scouring the leak for these IPs produced a list of 74 distinct user accounts whose assigned IPs between September '23 and '24 overlap with the Black Basta IOC list. Most of these accounts only have a handful of matches (one or two IPs), which is consistent with Black Basta being Ransomware-as-a-Service. Therefore, it could be that Media Land also had some Black Basta affiliates on their networks. More importantly, however, is the detail of the account with the largest footprint having the account name "Mister Reseller". Thus, based on the number of Black Basta IPs this account manages compared to the ones present on Media Land infrastructure, it could as well be that this account is acting as a reseller to Black Basta, brokering access to the Media Land infrastructure. As Figure 4 shows, there is one account that stands out in terms of footprint. This account in particular also has a significant number (1902) of IP assignments and seems to have a high churn of resources, which is also in line with reseller behaviour. 

![](../../../assets/blackbasta_gantt.png)
<span class="centered-text">Figure 4: Gantt diagram of all accounts managing Black Basta indicators, the time they had them for, and how many</span>

It is worth stressing that these overlaps do not prove that any given account belongs to Black Basta themselves. However, they illustrate how internal hosting records and abuse indicators can be combined to at least reveal a supply-chain layer behind a ransomware operation: which customers provisioned the infrastructure later used in attacks, and which intermediaries may have been brokering access. 

# Why this leak matters
With the UK, US, and Australia having announced sanctions against Media Land for being a Bulletproof Hoster, this leak gives a rare look into how this type of infrastructure actually operates. Its value lies in the structural patterns that emerge across billing, provisioning, and IP assignment. Taken together, these records show how services are organised, how address space is recycled at scale, and how reseller-like entities act as intermediaries between the platform and the actors who rely on it.

Linking the internal history to external indicators such as the Black Basta IPs does not identify individuals. It does, however, reveal part of the supply chain behind ransomware operations by showing which customer segments provisioned infrastructure later used in attacks and how access may have been brokered.

For defenders and researchers, this shifts the focus from single malicious IPs to the ecosystem that generates them. Leaks like this help build an evidence-based understanding of how bulletproof hosting functions in practice and where meaningful points of intervention may exist.

---
layout: article
title: "Handled, Not Hosted: Administrative Activity Inside a Bulletproof Hoster"

description: "An analysis of administrative activity in the Media Land leak, showing how provider-level behaviour is concentrated, embedded in customer infrastructure, and observable on systems linked to ransomware operations."
excerpt: "Administrative activity in Media Land is concentrated, shared across administrators, and embedded in customer infrastructure, with direct overlap with ransomware-linked systems. This post shows what that looks like in practice."

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
> This post analyzes administrative activity in the leaked Media Land dataset and shows that provider-level behaviour is concentrated, shared across administrators, and embedded in the same access layer as customer operations. These interactions disproportionately target high-capacity accounts linked to ransomware infrastructure and persist over time. In addition, administrator-linked SSH key material is present on live systems in that environment. While this does not establish intent, it shows how provider access and abuse infrastructure can become intertwined in practice.

Two posts ago, I decided to [go through](https://disclosing.observer/2025/11/24/bulletproof-hoster-anatomy-data-driven-reconstruction.html) the leaked internal database of the [Media Land](https://www.nationalcrimeagency.gov.uk/news/prolific-bulletproof-hosting-service-sanctioned-by-the-uk-and-allies) bulletproof hoster to reconstruct and understand its internal structure. That analysis focused on customer-side resource allocation: which accounts received infrastructure, how address space moved through the platform, and which users overlapped with IP addresses mentioned in the [Black Basta leak](https://www.first.org/blog/20250321-black-basta-ransomware-leak).

This post continues from the same dataset, but looks at a different layer of the platform. Instead of asking which customers were assigned abuse-linked infrastructure, I figured it was worth investigating how Media Land's own administrative accounts interacted with that infrastructure, and whether provider-level access artifacts can still be observed on systems linked to the same operational ecosystem. 

The previous post established several findings that this analysis builds on directly. Cross-referencing Media Land's internal IP assignment history with indicators from the Black Basta leak identified 74 customer accounts whose assigned infrastructure overlapped with Black Basta activity between September 2023 and September 2024. One account dominated that overlap: a user registered under the name "Mr Reseller" (Мистер Ресселер), identified through password reuse across two accounts, who managed 1902 unique IP assignments and had 207 Black Basta-linked IPs in that period. That account also showed patterns consistent with reseller behaviour: high subscription volume, high IP churn, and significant cryptocurrency payments. SSH key analysis additionally showed that several clusters of accounts shared key material, and that these keys could in principle be scanned for on live systems. Those findings form the customer-side baseline. This post examines what the administrative layer was doing with the same infrastructure.

That distinction between customer-side allocation and provider-level access matters. A hosting provider's default relationship with customer infrastructure is structurally passive: provision the resource, maintain uptime, step back. That argument becomes harder to sustain when the provider's behaviour is instead structurally active, meaning sustained and concentrated engagement with specific high-risk accounts across multiple administrators. This shows that the separation between customer infrastructure and provider access was not clean. The underlying question is what evidence of provider control looks like at the infrastructure level, and the analysis that follows treats it as an empirical one.

This distinction aligns with what [Recorded Future describes](https://assets.recordedfuture.com/insikt-report-pdfs/2026/cta-2026-0319.pdf) as threat activity enablers (TAEs): infrastructure providers and services that do not merely host malicious activity, but materially support its persistence, scalability, or operational effectiveness. 

The patterns observed here are more consistent with enabling behaviour than with passive provisioning. They include sustained administrative interaction with high-risk accounts, shared handling across operators, and the persistence of provider-linked access artifacts. This type of positioning is also reflected in [governance debates](https://bindinghook.com/neutral-internet-governance-enables-sanctions-evasion/) around “neutral” infrastructure, where providers frame themselves as passive intermediaries while continuing to facilitate sanctioned or criminal activity through their services. Taken together, these patterns are not consistent with passive hosting, but with provider-level behaviour that enables the persistence of abuse-linked infrastructure.

Under Article 6 of the European [Digital Services Act](https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng), hosters even have a liability exemption for whatever happens on their infrastructure until they can have _actual_ knowledge or awareness of illegal activity or content, the provider does not act _expeditiously_ to remove or disable access, or the user is acting under authority or control of the provider. This last aspect is important, as it directly relates to whether provider involvement goes beyond passive hosting and into forms of control.

# Administrative Data and Observability
As discussed in the previous post, the Media Land leak includes not only customer-side records, but also a limited set of administrative artifacts. These consist of administrator accounts, their assigned roles, and authentication logs capturing timestamps, source IPs, and client fingerprints. While incomplete, this data provides a direct view into how the platform was accessed and operated from the provider side.

Unlike customer data, which reflects how infrastructure is allocated and used, these records capture who has control over that infrastructure and how that control is exercised. On their own, they do not reveal specific actions or intent, but they establish the identities and access patterns of the administrative layer.

This distinction matters for the analysis that follows. The same identifiers, IP addresses, and access patterns observed here reappear elsewhere in the dataset, and in some cases outside the platform entirely. Before linking those layers, it is necessary to establish which administrative identities exist and how they appear in the data.

The table below lists the administrative accounts observed in the leak. These accounts form the control surface through which the platform is managed and provide the anchor points for the analysis that follows.

|---
| id | name | email | role | created_at | blocked | note
|-|:-|:-:|-:|-:|-:|-:
| ea1f2758-7cc0-41c6-95c8-50405f9c2728 | Д\*\*\* | daniil.p\*\*\*\*\*\*@sshvps.net | admin | 2023-02-07 20:20:07 | no | 
| ed8ccba6-c077-4a42-9e5c-54fcdca0c8b7 | С\*\*\* Б\*\*\* | aleksandr.b\*\*\*\*\*\*@sshvps.net | admin | 2023-02-07 20:22:07 | no | 
| 04b2c153-89e9-43b2-926b-f768c0cd80a4 | Д\*\*\* Б\*\*\* | dmitrij.b\*\*\*\*\*\*@sshvps.net | admin | 2023-02-08 12:09:30 | yes | uvolen
| 8c6342f0-ee4c-45f6-9106-e30f13eaa1b4 | — | bulat.t\*\*\*\*\*\*@sshvps.net | admin | 2023-05-11 13:06:02 | no | 
| 1525e327-515f-4efd-84a1-d08830346a51 | tester_2 | bulat.t\*\*\*\*\*\*@gmail.com | admin | 2023-05-31 14:09:52 | no | test
| 100d7eea-31be-4007-b2d6-0ab127e70508 | Е\*\*\* Д\*\*\* | e.d********@sshvps.net | admin | 2023-05-29 13:16:10 | no | 
| 2a0dbc3c-bfd2-491c-979f-c4a2b4165045 | А\*\*\* К\*\*\* | andrey.k\*\*\*\*\*\*@sshvps.net | admin | 2022-06-10 13:47:27 | yes | del
| 7ca909e0-b297-4386-b6db-4e5164e36cb5 | С\*\*\* | stanislav.r\*\*\*\*\*\*@sshvps.net | admin | 2023-02-07 20:07:06 | no | key ref
| 56a29d25-5414-424c-98d8-c1d9c48e3650 | К\*\*\* | ek.b****@sshvps.net | admin | 2023-05-24 14:11:37 | yes | Админ
| 167df3d9-b030-4f8e-bdff-04547c334bc2 | Boss | a@aa3.ru | admin | 2023-02-08 11:59:54 | yes | d
| 94ed2348-726e-43c0-9bfe-2b2d19549014 | alex | alex.k\*\*\*\*@gmail.com | admin | 2025-01-08 14:41:28 | no | 
| 4803d42c-482b-485d-9a26-c80a4a95ad11 | alex | alex@ml.cloud | admin | 2025-02-05 16:42:19 | no | 
|---

<span class="centered-text">Table 1: Admin accounts in the Media Land leak</span>


# From Administrative Identities to Activity

Identifying administrative accounts establishes who operates the platform. The next step is to examine how these accounts behave in practice.

This section analyzes administrative activity as observed in authentication logs. By focusing on events explicitly marked as administrative, it captures interactions performed through the provider’s control plane rather than independent user behaviour. This makes it possible to observe how administrative accounts engage with customer accounts, which accounts receive sustained attention, and how this activity is distributed across administrators.

The goal is not to infer intent from individual actions, but to characterize patterns of interaction. In particular, the analysis focuses on whether administrative activity is evenly distributed, as would be expected from routine support, or concentrated around specific accounts and infrastructure. These patterns provide context for interpreting the relationship between the provider’s administrative layer and accounts independently linked to abuse infrastructure.

## Administrative Activity in Authentication Logs

With the set of administrative identities established, the next step is to examine how these accounts appear in the authentication logs.

A subset of user authentication events is explicitly marked as administrative (`is_admin = true`) and linked to specific administrator IDs. These events represent actions performed through the administrative control plane, rather than independent user logins. They therefore provide a view into how provider-side accounts interacted with customer accounts over time.

The activity is highly concentrated. A single administrative account, referred to here as “Boss” (admin uid `167df3d9-...`), dominates the dataset, appearing in 876 admin-mediated user authentication events across 201 distinct user accounts. Other administrators are present, including accounts such as `alex@ml.cloud`, but their activity is much more limited by comparison.

## Concentrated Interaction with High-Risk Accounts

The distribution of target accounts is similarly skewed.

One account, identified in the [previous blogpost](https://disclosing.observer/2025/11/24/bulletproof-hoster-anatomy-data-driven-reconstruction.html#hunting-black-basta) as “Mr Reseller” (Мистер Ресселер), is the most frequently admin-accessed user account in the dataset. Across all administrators, it accounts for 352 admin-mediated events and is accessed by five distinct administrative identities. The “Boss” account accounts for most of this activity, with 307 events, but the account is not handled by a single operator.

This matters because “Mr Reseller” was previously shown to have a disproportionately large overlap with IP addresses linked to Black Basta activity. The logs therefore show repeated administrative interaction with the account that also sits at the centre of the observed abuse-linked infrastructure.

The remaining interactions form a long tail across smaller accounts. Some administrative access is expected in a hosting environment (support, provisioning, troubleshooting), but the distribution here is not flat. It is strongly concentrated around a small number of accounts, with “Mr Reseller” as the clearest focal point. That pattern is not consistent with incidental support activity alone.

These interactions also occur over extended periods rather than isolated bursts, indicating sustained engagement with specific accounts.

<div class="plot-embed">
  <iframe
    src="{{ '/assets/boss_mr_reseller_vs_other_weekly.html' | relative_url }}"
    width="100%"
    height="520"
    style="border:0; border-radius: 8px; background: transparent;"
    loading="lazy"
  ></iframe>
</div>
<span class="centered-text">
Figure 1: Weekly admin-mediated authentication events by the “Boss” account, highlighting sustained interaction with “Mr Reseller”.
</span>

Figure 1 shows that the concentration is not a one-off artifact. The same administrator repeatedly interacts with the same account over time.

## Shared Handling Across Administrators

Administrative activity is not limited to a single operator.

As shown in Figure 2, multiple administrative accounts repeatedly interact with the same small set of high-activity users, with “Mr Reseller” acting as a shared focal point. This indicates that the observed pattern reflects platform-level handling rather than isolated behaviour by a single administrator.

<div class="plot-embed">
  <iframe
    src="{{ '/assets/medialand_admin_user_heatmap.html' | relative_url }}"
    width="100%"
    height="520"
    style="border:0; border-radius: 8px; background: transparent;"
    loading="lazy"
  ></iframe>
</div>
<span class="centered-text">
Figure 2: Admin–user interaction matrix showing the distribution of admin-mediated authentication events across administrators and user accounts.
</span>

## Shared Access Infrastructure and Internal Accounts

The same administrative identity also appears repeatedly in admin-mediated authentication events for a user ID linked to Media Land’s corporate account (`info@ml.cloud`). This account is associated with confirmed company payment records referencing ООО “Медиа Лэнд” and Alexander Volosovik (AKA Yalishanda), who was [sanctioned](https://www.nationalcrimeagency.gov.uk/news/prolific-bulletproof-hosting-service-sanctioned-by-the-uk-and-allies) by the UK, US, and Australia. These interactions occur over extended periods and originate from the same infrastructure endpoints used for reseller-facing activity.

At the network level, access is similarly concentrated. A small number of IP addresses account for a large share of both administrative and user authentication events. The clearest example is `213.21.57.80`, an IP owned by [Global Network Management](https://bgp.tools/as/31500), which appears consistently across sessions linked to the “Boss” account.

This address is also associated with a large number of user authentication events, often in close temporal proximity to administrative actions tied to the same identity. This suggests that some observed user activity from this address reflects administrative interaction with user accounts through a shared access point, rather than independent user logins.

Beyond these centralized access points, administrative activity is observed from a heterogeneous set of IP addresses spanning consumer ISPs, hosting providers, and infrastructure networks across regions including Russia, Thailand, and China. Most of these IPs appear sporadically. This pattern is consistent with a mixed access surface combining stable infrastructure with more distributed or proxied access.

## Direct Credential Linkage to External Actor Activity

So far, the analysis has focused on patterns: which accounts admins interact with, and how activity is distributed. There is also a more direct link between the internal data and external actor activity. The example below is not a one-off. Similar overlaps show up on other hosts in the same ranges, but this case is enough to show how the linkage works.

In the Black Basta leak, a chat message attributed to the actor “slim shady” ([identified](https://analyst1.com/wp-content/uploads/2026/01/Yalishanda.pdf) as Kirill Zatolokin, also included in the [sanctions](https://www.nationalcrimeagency.gov.uk/news/prolific-bulletproof-hosting-service-sanctioned-by-the-uk-and-allies) on Media Land) includes access details for a server at `45.141.87.77`:

- Username: `root`  
- Password: `pVKwpAhne8ytrsS`

<div class="plot-embed" style="text-align:center;">
  <img
    src="{{ '/assets/blackbasta_leak_screenshot.png' | relative_url }}"
    style="width:80%; border-radius:8px;"
    loading="lazy"
  />
</div>
<span class="centered-text">
Figure 3: Excerpt from Black Basta chat logs showing credentials for a host later identified in the Media Land dataset.
</span>

That same password appears in the Media Land dataset in provisioning logs (`hosting_hosting_sagas.csv`) and instance data (`hosting_instance.csv`). It is tied to a specific machine (`truck_86`) with the same IP address (`45.141.87.77`), assigned to the user account of Mr Reseller. Further billing records link this instance to the Boss account.

In other words, the same system shows up in:

- the Black Basta chat logs,  
- the internal provisioning data,  
- and the platform’s billing records.

This is not based on IP overlap or DNS data, which can be noisy. It is the same credential tied to the same machine inside the platform. This shows that a system provisioned through the platform, assigned to a high-risk customer account, and linked to administrative activity, appears directly in actor communication associated with ransomware operations. It also aligns with [public reporting](https://www.nationalcrimeagency.gov.uk/news/prolific-bulletproof-hosting-service-sanctioned-by-the-uk-and-allies) on the roles of Volosovik and Zatolokin, who are described as coordinating and supporting cybercrime infrastructure.

## Interpretation and Transition

Taken together, the authentication logs show three things. First, administrative activity is concentrated in a small number of accounts, especially “Boss.” Second, that activity disproportionately targets a small set of user accounts, most notably “Mr Reseller.” Third, the same access infrastructure appears across administrative, reseller-facing, and corporate-account activity.

These observations show sustained operational proximity between the provider’s administrative layer and accounts independently linked to abuse infrastructure.

The next section shifts from administrative behaviour to administrative presence. The logs show how provider-side accounts interacted with user accounts. The following analysis examines whether provider-linked access artifacts persist on systems associated with abuse infrastructure. These are distinct forms of evidence and are treated separately.

# Administrative Artifacts Beyond the Platform

The internal data already shows that administrative access is embedded in the same environment as customer activity. To test whether this overlap extends beyond the platform, I looked for external traces of provider-side access artifacts.

As discussed in the previous blogpost, the [Catch-22 paper](https://www.usenix.org/conference/usenixsecurity25/presentation/munteanu) by Munteanu et al. can be used to confirm the presence of SSH public keys on internet-facing systems. Using SSH keys recovered from the leak, I identified a small number of live hosts (as of April 30th, 2026) in Media Land address space that contained one of these keys.

The key in question is associated in the dataset with the name DevOps (also included in Figure 2), which is also one of the user accounts most frequently accessed by administrators. The same key corresponds to a public key attributed elsewhere to a Media Land administrator, linking it to the administrative layer without requiring direct attribution of its use on these systems.

The key is still present on active systems as of April 30th, 2026, indicating that provider-linked access material persists on live infrastructure. Passive DNS shows that several of these hosts also appear in infrastructure associated with `fuck-you-usa.com`, which has been [documented](https://blog.eclecticiq.com/inside-bruted-black-basta-raas-members-used-automated-brute-forcing-framework-to-target-edge-network-devices) as a SOCKS proxy network used by the BRUTED framework of Black Basta.

This infrastructure is not incidental. Analyses of the BRUTED framework show that Black Basta relies on large-scale automated scanning and credential stuffing against edge devices, using such proxy networks to distribute and obscure attack traffic. The observed hosts therefore align with the group’s primary access mechanism rather than a peripheral component of their operations.

|---
| IP address      | DNS overlap with `fuck-you-usa.com`
|-|:-:
| 45.141.84.5     | yes
| 45.141.84.73    | no
| 45.141.86.222   | yes
| 45.141.87.68    | yes
| 45.141.87.130   | yes
| 45.141.87.169   | no
| 45.141.87.175   | no
| 45.141.87.215   | no
| 194.26.29.42    | yes
|---

<span class="centered-text">Table 2: Live hosts in the Media Land range that contain administrator-linked SSH public keys as of 30-04-2026</span>

The continued presence of administrator-linked SSH keys on these hosts has an important methodological implication. Because these systems are still reachable and retain the same access artifacts, they are unlikely to represent reassigned or repurposed IP addresses. This reduces the risk that the observed passive DNS overlap is an artifact of IP churn, and strengthens the interpretation that these hosts are part of the same operational environment rather than transient or historical allocations.

This shows that administrator-linked access material is present on multiple systems that are also used in abuse-related infrastructure.

Taken together, this strengthens the earlier observation: administrative access is not cleanly separated from customer-controlled systems, including in environments where those systems are used for large-scale abuse.

# Conclusion

The analysis connects three observations that reinforce each other. Administrative activity in the Media Land dataset is persistent, highly concentrated, and not confined to a separate control plane; it is embedded within the same access layer as customer operations. That activity disproportionately targets a small number of high-capacity accounts, most notably "Mr Reseller," and is distributed across multiple administrators, indicating this reflects platform-level handling rather than isolated operator behavior. Finally, administrator-linked SSH key material persists on live hosts in Media Land address space, several of which overlap with infrastructure used in Black Basta's BRUTED proxy network.

None of this establishes intent or direct operation of abuse infrastructure. What it does establish is that the boundary between provider access and customer-controlled systems was not maintained in practice.

Bulletproof hosting is often framed primarily as a permissiveness problem: providers that ignore abuse complaints, resist takedowns, or shelter behind permissive jurisdictions. What this dataset suggests is that the relationship can be more direct. The access patterns here are not consistent with a provider that looks the other way. They are consistent with behaviour that enables the continued operation of abuse-linked systems. Whether that behaviour constitutes control in a legal sense is a question for regulators and courts, but the data provides a concrete example of how facilitating a criminal ecosystem can manifest at the level of infrastructure and access, even without direct evidence of operator involvement. The infrastructure record does not resolve intent, but it does narrow the space of plausible explanations and changes what questions can be asked of it.

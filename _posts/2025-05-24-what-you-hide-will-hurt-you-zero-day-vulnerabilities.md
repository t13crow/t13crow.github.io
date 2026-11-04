---
layout: article
title: "What You Hide Will Hurt You: The Streisand Effect of Zero-Day Vulnerabilities"

description: "An analysis of how attempts to suppress zero-day vulnerability disclosure can backfire, increasing attention, risk, and harm through a Streisand effect."
excerpt: "Most vulnerabilities never make headlines. Botched disclosures do. This post examines how attempts to silence researchers can amplify attention and risk rather than contain it."

tags:
  - Vulnerability Disclosure

author: Max van der Horst
mathjax: true

show_author_profile: true
show_edit_on_github: false

header:
  theme: dark
article_header:
  type: overlay
show_tags: false
---

When I first became a CVE Numbering Authority (CNA) administrator at DIVD, I assumed most software vendors would welcome a heads-up about critical vulnerabilities in their products. We're not selling zero-days, we're helping these vendors remediate them. However, over time, I learned a strange truth: many vendors would rather silence the messenger than fix the message. From legal threats to ostrich politics, the instinct to cover-up a zero-day vulnerability runs deep. Ironically, it's this reaction (rather than the vulnerability itself) that often causes the most reputational damage. What you hide will hurt you. And in cybersecurity, few things backfire harder than trying to bury insecurity.

# Life as a CNA administrator
CNAs are organizations authorized by the [CVE Program](https://cve.mitre.org) to assign CVE IDs to newly discovered vulnerabilities and publish related details. CNAs are the backbone of the distributed vulnerability reporting system that powers CVE. They can be software vendors, coordination centers, bug bounty platforms, or, like DIVD, security research groups.

Being a CNA administrator at DIVD means acting as a trusted intermediary in the vulnerability disclosure process. Specifically, DIVD is designated as a Research CNA: a type of CNA authorized to assign CVE IDs for vulnerabilities discovered through its own independent security research. Unlike vendor CNAs, which typically cover the security of their own products, Research CNAs do not need to be the creator or maintainer of the affected software and do not rely on vendor permission to assign a CVE. As a Research CNA administrator, we receive vulnerability reports, validate them, coordinate with the vendors where possible, and publish CVE records when Coordinated Vulnerability Disclosure processes have followed through. This role is about much more than just managing identifiers though, it's about navigating technical, ethical, and sometimes political terrain. 

At DIVD, our approach is public-interest driven: typically we are of the opinion that the public has the right to know about a security issue in the software they use. After all, it may affect them personally and they have the right to decide whether or not they want to continue using this software. Therefore, after making sure we have successfully coordinated a disclosure and a remediation has been issued, we also tend to seek out people that are still affected by the vulnerability in order to warn them. The first step in doing this is always to coordinate a disclosure with the vendor, otherwise we end up resorting to disproportionate methodology as is [extensively discussed in my article on disclosure ethics](https://disclosing.observer/2025/05/10/unsolicited-vulnerability-disclosure-ethics.html). Our mission is clear, but the path isn't always smooth. Some vendors cooperate openly, understanding the value of transparency and early warnings. Others treat our contact as a threat instead of a courtesy, despite the fact that we're offering voluntary help, not blame.

Over time, this role teaches you something about organizational maturity, communication under pressure, and how reputations are built (or broken) in the way vendors respond to bad news.


![](../../../assets/CNA-workflow.svg){: .centered-img }
<span class="centered-text">Figure 1: CNA workflow</span>

# The playbook of avoidance
Not all companies react the same way to a vulnerability disclosure. Some respond with a clear acknowledgement, quick triage, and a patch timeline. Others will stall, deny, escalate to legal teams, or straight up ignore you hoping to demoralize so that you give up. All of this happens before anyone technical has even looked at the report. These tactics aren't just frustrating, they're risky. In the case of some critical vulnerabilities, the time to patch needs to be as short as possible. Every delay increases the window of exploitation and, paradoxically, draws more attention when the issue finally surfaces. 

Earlier this year we handled a report that shows just how long some vendors will try to wait you out. An independent researcher, now a member of DIVD, had uncovered a set of high-severity vulnerabilities in a software product widely used by government agencies in one particular country. He had been emailing the vendor, politely and persistently, since 2022. He had received no response. Once the report reached DIVD we re-validated the bugs and started our standard outreach: attempts to contact by phone, email, and LinkedIn. Three months passed, after which we requested that this country's national CSIRT relay the warning. They, too, were met with radio silence. With 90 days gone and no progress, we published a limited disclosure that included the newly assigned CVE IDs and the advice to not use this product anymore due to the fundamental design weaknesses. Within twenty-four hours, the vendor surfaced: not with a remediation plan, but with a complaint that they "did not want their customers to know about these issues" and that they "wanted the publication taken down". This is a perfect example of the *ignore-until-it-hurts* tactic: three years of quiet, private nudging produced nothing; one short public notice produced an immediate, though still defensive, response.

This is why we tend to alert vendors that we are sticking to [our own written CNA procedure](https://csirt.divd.nl/cna/). This procedure is based on the [Coordinated Vulnerability Disclosure guideline](https://english.ncsc.nl/publications/publications/2019/juni/01/coordinated-vulnerability-disclosure-the-guideline) by the Dutch National Cyber Security Center (NCSC-NL). This guideline discusses the general consensus that a 60-day window should be sufficient to fix most software vulnerabilities. Hardware vulnerabilities should take longer and have a 180-day window. Of course, as long as a vendor is communicating openly about their progress, we will not be stringent about this. However, we are not afraid to use this as a tool to leverage a response and ultimately inform the public about the (at that point still unpatched) vulnerability. We will do this through a so-called limited disclosure and product warning. Vendors get to deliver input on the framing of any publications as we do not move towards this type of last resort, making it clearly in their best interest to collaborate and take responsibility. In the end, limited disclosures that contain the information that a vendor was not available for response or remediation do not look good.

# The role of the security industry in this mess
But let's be honest: part of the problem may be the cybersecurity industry as a whole. We have created some of the very incentives that make vendors want to hide their flaws. For years, we've treated the number of CVEs associated with a vendor as a scoreboard for vulnerability. Many practitioners still do. Think report headlines like *Top 10 Most Vulnerable Vendors This Year*. What does a high CVE count say to the public? Poor security. Broken systems. Incompetence. 

In reality, it's often the opposite. A high number of CVEs can signal maturity of the vulnerability management processes within an organization: people are looking, problems are being fixed, and the system is transparent enough to document it. That's a sign of a functioning security posture rather than a failing one. For example, in 2024, the [top vendor with distinct vulnerabilities registered as CVEs ](https://www.cvedetails.com/top-50-vendors.php?year=2024) was *Linux* with 3874 CVE IDs. The Linux community is likely one of the most security-aware ones out there, which is partially why they keep finding new issues that are then registered as CVEs. When we shame companies for having vulnerabilities, which is something that happens to the best of us, we create incentives for censorship. That's on us. If disclosure is to work, we have to stop treating visibility as guilt. At this point, one could even say that it is suspicious when a vendor does not have any claimed CVE IDs or otherwise published vulnerabilities.

# When the cover-up becomes the story
Here's the thing about unresolved limited disclosures: most vulnerabilities don't become front-page news on their own. What gets remembered, and what is reported, is how a company handles the situation once it becomes aware of the problem. In many cases, the vulnerability itself isn't what harms a company's reputation. It's the response. 

Obstructing disclosure, delaying patches, trying to silence or ignore researchers. It creates a second story: one that says they don't take security seriously. That second story spreads faster and sticks longer. Public shaming often follows obstruction, in contrast to the belief of some of these vendors that having to publish CVE IDs will tarnish their reputation. Media and researchers take note of silence and hostility. Customers, partners, and regulators may start asking questions. The issue inevitably becomes public, but now with a damaging narrative: lack of transparency and accountability. A great example of this is [the repeated security issues with videoconferencing software Zoom](https://www.cnbc.com/2020/04/02/zoom-ceo-apologizes-for-security-issues-users-spike-to-200-million.html), in which the vendor was aware of various vulnerabilities that were discovered by the public. Because of the vulnerabilities, the publicity it received, and the (lack of) response by the company behind Zoom, various large companies like NASA and SpaceX [banned the use of Zoom altogether](https://www.zdnet.com/article/zoom-were-freezing-all-new-features-to-sort-out-security-and-privacy/), setting an important precedent.

That's the Zero-Day Streisand effect. The more you try to hide the problem, the more visible and damaging it becomes. 

# What good looks like
Far from all responses are defensive or hostile. There are plenty of companies I've worked with that handle disclosures with transparency, speed, and professionalism. The contrast is absolutely striking. These are the organizations that take action within hours, thank us for the report, and keep us in the loop on remediation progress. They prioritize patching the issue, even when it's inconvenient. Some even take it a step further by publishing advisories, calling customers, publicly crediting the researcher, and using the opportunity to show their commitment to security.

These companies don't just fix bugs, they build trust. Ironically, some of the best reputations I've seen were forged in the heat of a serious vulnerability. Because when you handle bad news well, it says something powerful in my opinion: you're not perfect, but you're responsible. Companies that respond constructively earn real credibility, even when the vulnerability is a serious one. A result of this is that potential PR hits are turned into a trust-building moment both internally and externally. They signal that they take their security seriously, and this is what their customers (and employees) remember.

# Conclusion: transparency is the real fix
Every product has vulnerabilities. That's not the issue. The issue is whether you fix them, or spend your valuable time fighting the people that try to help you do so. Trying to hide zero-day vulnerabilities doesn't protect a brand. It fractures trust. Once the cover-up becomes the story, you've lost control of the narrative. The Streisand Effect takes over. 

Security isn't about being flawless. It's about being accountable. We need to stop punishing companies for being transparent, and this is an upcoming trend I am very happy to see. We need to recognize and reward taking the right steps when things become difficult. This is because in the long run, what you hide will hurt you. 

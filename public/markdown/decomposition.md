# Decomposition test
An issue that we are trying to solve is that LLM agents struggle with high level reasoning and planning.
If we can teach them to decompose high level tasks into smaller tasks, then we can then utilise computer-use to create agents that can plan and reason and perform generic tasks.

---
This system is designed to recursivly decompose high level tasks into smaller tasks, only stopping when a task takes fewer than a set number of seconds to complete.
(There might be better ways to check for completion but time works well for fast implementation and generic use.)

## Current Issues
However this decomposition program tends to fall into rabit holes and get distracted by less relevant sub tasks.  

Loops and rabbit holes seems to occur when the LLM sees the context has repeated tasks so it wants to continue the repetition.  

Perhaps having less generic but more structured approach could yield better results. 

## How Humans Decompose Tasks
Consider how I (a human) would do a task. If you told me to "build a website for my marketing company".
How would I go about it?

I'd probably start asking questions.
- Is there an example website you want me to base it on?
- What do you want to use the website for specifically?
- What kind of design and style would you like?

I'd then setup a plan.

Based on the scope of the project, what is the fastest and best way to build the website?

### Notes from case study
Have a way of classifying mid level tasks into different categories:
- Obtaining information via questioning user or other sources.
- Generate task objectives.
- Generate task stages.

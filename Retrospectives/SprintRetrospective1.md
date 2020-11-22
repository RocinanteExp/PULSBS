TEMPLATE FOR RETROSPECTIVE (add your team name)
=====================================

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES 

### Macro statistics

- Number of stories committed vs done 
- Total points committed vs done 
- Nr of hours planned vs spent (as a team)

**Remember**  a story is done ONLY if it fits the Definition of Done:
 
- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed

> Please refine your DoD 

### Detailed statistics

| Story  | # Tasks | Points | Hours est. | Hours actual | Status |
|--------|---------|--------|------------|--------------|--------|
| _#0_   |         |    -   |            |              |        |
| | 26 | | 6h | 7h 30min | done | 
| | 30 | | 3h | 3h 10min | done |
| | 27 | | 5h | 2h 20min | done |
| | 48 | | 6h | 2h 30min | done |
| | 49 | | 2h | 1h 45min | done |
| _#3_ | | 3 | | | |
| | 37 | | 2h | 3h 30min | done |
| | 38 | | 1h 30min | 2h | done |
| | 44 | | 3h | 2h 50min | review |
| | 45 | | 2h | 4h | done |
| | 46 | | 2h | 1h 15min | done |
| #4 | | 8 | | | |
| | 39 | | 2h | 25min | done |
| | 47 | | 2h | ? | review |

   

> place technical tasks corresponding to story `#0` and leave out story points (not applicable in this case)

- Hours per task (average, standard deviation)

- Total task estimation error ratio: sum of total hours estimation / sum of total hours spent from previous table

  
## QUALITY MEASURES 

- Unit Testing:
  - Total hours estimated : 17 hours
  - Total hours spent : 17hours 9minutes
  - Nr of automated unit test cases:
    - Client-side : 28 tests
    - Server-side : 20 tests
  - Coverage : 54.39 %
- E2E testing:
  - Total hours estimated : 4 hours
  - Total hours spent : 7hours 30minutes
- Code review 
  - Total hours estimated 
  - Total hours spent
- Technical Debt management:
  - Total hours estimated 
  - Total hours spent
  - Hours estimated for remediation by SonarQube
  - Hours spent on remediation 
  - debt ratio (as reported by SonarQube under "Measures-Maintainability")
  - rating for each quality characteristic reported in SonarQube under "Measures" (namely reliability, security, maintainability )
  


## ASSESSMENT

- What caused your errors in estimation (if any)?

- What lessons did you learn (both positive and negative) in this sprint?

- Which improvement goals set in the previous retrospective were you able to achieve? 
  
- Which ones you were not able to achieve? Why?

- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)

> Propose one or two

- One thing you are proud of as a Team!!
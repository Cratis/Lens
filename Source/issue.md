Lets improve the extension. 

0. Add a dependency to @cratis/arc.react so that we get all the types to work with for the rest of the points below.
1. Seperate between what is options and what is current value settings
2. Options should be called settings.
3. Components is not a name - we are feature oriented.
4. Commands & Queries does not belong to settings, but the root
5. Introduce PrimeReact (https://primereact.org/installation/)
6. We should have a vertical tab based on PrimeReact, sitting on the left side with only icons per tab and a tooltip saying more details what the tab is for.
7. Add a tab for the current default view of user and tenant selection
8. Add a tab for commands
9. Add a tab for queries
10. In the commands view, use a tree view (from PrimeReact) to show commands in a hierarchy based on the namespace information from the command. When clicking a command, selecting a command should then bring up the details of the command with a headline and description, if available, and a form to fill out what it needs based on the type / schema returned and then a "execute" button and the command result below it, nicely formatted - not JSON raw output.
11. In the queries view, similar as with commands - treeview - and a similar details view, but this should say "perform" and also the result should be a datatable (PrimeReact). If it doesn't succeed we should show the errors (QueryResult) nicely formatted - not raw JSON.


import { Command } from "commander";
import { Octokit } from "@octokit/core";

const program = new Command();
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function searchRepos(query, page = 1) {
  const perPage = 100; // Number of results per page (adjust as needed)

  const response = await octokit.request("GET /search/repositories", {
    q: query,
    sort: "stars",
    order: "desc",
    page: page,
    per_page: perPage,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  const results = response.data.items;

  // Check if there are any more pages to search
  if (results.length === 0 || page * perPage >= response.data.total_count) {
    return results; // No more results or reached last page
  }

  // Continue pagination if needed
  const nextPageResults = await searchRepos(query, page + 1);
  return results.concat(nextPageResults); // Combine results
}

program
  .name("github-most-starred")
  .description(
    "CLI to find github most starred repositories created between a date range",
  )
  .version("0.0.1");

program
  .requiredOption("-s, --start <date>", "Starting date (in yyyy-mm-dd)")
  .requiredOption("-e, --end <date>", "Ending date (in yyyy-mm-dd)")
  .action(async (options) => {
    const thresholds = [100000, 10000, 1000, 100, 10, 1];
    let found = false;
    for (const threshold of thresholds) {
      console.log(
        `Searching repositories with more than ${threshold} stars...`,
      );
      const query = `created:${options.start}..${options.end} stars:>${threshold}`;
      try {
        const allResults = await searchRepos(query);
        if (allResults.length > 0) {
          const mostStarred = allResults.reduce((prev, current) => {
            // Compare stars and return the repo with the most stars
            return prev.stargazers_count > current.stargazers_count
              ? prev
              : current;
          }, allResults[0]); // Initialize with first result

          console.log(`Most starred repository:`);
          console.log(`  Name: ${mostStarred.name}`);
          console.log(`  URL: ${mostStarred.html_url}`);
          console.log(`  Number of stars: ${mostStarred.stargazers_count}`);
          found = true;
          break;
        }
      } catch (error) {
        console.error(error);
      }
    }
    if (!found) {
      console.log(`No repository found.`);
    }
  });

program.parseAsync(process.argv);

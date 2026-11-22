#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA_PATH = resolve(process.cwd(), 'assets/js/changelog-data.json');

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function classifyImpact(subjects) {
  const joined = subjects.join('\n');
  if (/(\[major\]|breaking|feat!:|major:|redesign|rewrite|migration)/i.test(joined)) {
    return 'major';
  }
  if (/(\[medium\]|feat:|add\b|improve|optimize|support|auto-|animate|new\b|upgrade|changelog|build version)/i.test(joined)) {
    return 'medium';
  }
  return 'minor';
}

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const headSha = git(['rev-parse', 'HEAD']);
  const headShort = git(['rev-parse', '--short', 'HEAD']);

  if (data.lastCommit === headSha) {
    console.log('Changelog already up to date at', headShort);
    return;
  }

  let range = 'HEAD~1..HEAD';
  if (data.lastCommit) {
    try {
      execFileSync('git', ['cat-file', '-e', `${data.lastCommit}^{commit}`], { stdio: 'ignore' });
      range = `${data.lastCommit}..HEAD`;
    } catch {
      range = 'HEAD~1..HEAD';
    }
  }

  const rawLog = git(['log', range, '--no-merges', '--format=%H%x09%h%x09%cs%x09%s']);
  const commits = rawLog
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, shortSha, date, subject] = line.split('\t');
      return { sha, shortSha, date, subject };
    })
    .filter((c) => !/\[skip ci\]|^chore\(changelog\):/i.test(c.subject));

  if (!commits.length) {
    data.lastCommit = headSha;
    writeFileSync(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    console.log('No user-facing commits to append; updated lastCommit.');
    return;
  }

  const subjects = commits.map((c) => c.subject);
  const impact = classifyImpact(subjects);
  const latest = commits[0];

  data.entries.push({
    impact,
    title: commits.length === 1 ? latest.subject : `${latest.subject} (+${commits.length - 1} updates)`,
    date: latest.date,
    commit: latest.shortSha,
    items: subjects
  });
  data.lastCommit = headSha;

  writeFileSync(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`Appended ${impact} release (${latest.shortSha}) with ${commits.length} commit(s).`);
}

main();

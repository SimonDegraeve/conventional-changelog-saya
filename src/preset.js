/**
 *
 */
import getDefaultConfig from 'conventional-changelog-core/lib/merge-config';
import { concat } from './utils';


/**
 *
 */
const getTemplate = () => `{{!-- --}}
<a name="{{version}}"></a>
## {{versionLink}}
> {{date}}

{{#each commitGroups}}
{{#each commits}}
* {{commitLink}} **{{type}}:** {{subject}}
{{/each}}
{{/each}}

{{#each noteGroups}}
### {{title}}

{{#each notes}}
* {{text}}
{{/each}}

{{/each}}`;


/**
 *
 */
const getTypeMapping = () => ({
  feat: { name: 'Feature', isVisible: true },
  tweak: { name: 'Tweak', isVisible: true },
  fix: { name: 'Bugfix', isVisible: true },
  dependency: { name: 'Dependency', isVisible: true },
  revert: { name: 'Revert', isVisible: true },
  release: { name: 'Release', isVisible: false },
  test: { name: 'Test', isVisible: false },
  doc: { name: 'Documentation', isVisible: false },
  noop: { name: 'Extraneous', isVisible: false },
});


/**
 *
 */
const getVersionLink = (context) => {
  const text = context.version;
  const link = concat([
    context.host, '/', context.owner, '/', context.repository,
    `/compare/${context.previousTag}...${context.currentTag}`,
  ]);

  return (context.linkCompare ? `[${text}](${link})` : text);
};


/**
 *
 */
const getReferenceLink = (context, issue) => {
  const text = `#${issue}`;
  const link = concat([
    context.host, '/', context.owner, '/', context.repository,
    `/${context.issue}/${issue}`,
  ]);

  return `[${text}](${link})`;
};


/**
 *
 */
const getCommitLink = (context, hash) => {
  const text = hash;
  const link = concat([
    context.host, '/', context.owner, '/', context.repository,
    `/${context.commit}/${hash}`,
  ]);

  return `[${text}](${link})`;
};


/**
 *
 */
const finalizeContext = context => ({ ...context, versionLink: getVersionLink(context) });


/**
 *
 */
const isBreakingChange = commit => !!(
  commit.notes.find(note => note.title.match(/Breaking/i)) ||
  typeof commit['breaking-change'] === 'string'
);


/**
 *
 */
const isDeprecatingChange = commit => !!(
  commit.notes.find(note => note.title.match(/Deprecating/i)) ||
  typeof commit['deprecating-change'] === 'string'
);


/**
 *
 */
const transformCommit = typeMapping => (commit, context) => {
  // Filter valid type
  const mappedType = typeMapping[commit.type];
  if (!mappedType || !mappedType.isVisible) {
    return undefined;
  }

  // Normalize type
  const type = concat([
    mappedType.name,
    isDeprecatingChange(commit) ? '/Deprecating' : '',
    isBreakingChange(commit) ? '/Breaking' : '',
  ]);

  // Normalize notes
  const notes = commit.notes.map(note => ({
    ...note,
    text: note.text.replace(/\n/g, `\n  `),
    title: note.title.replace(/^D.*/i, 'Deprecating Changes').replace(/^B.*/i, 'Breaking Changes'),
  }));

  // Normalize hash
  const hash = (commit.hash || '').substring(0, 7);
  const commitLink = getCommitLink(context, hash);

  // Nornalize subject and references
  const references = commit.references;
  const subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
    const index = references.findIndex(reference => reference.issue === issue);
    if (index !== -1) {
      references.splice(index, 1);
    }
    return getReferenceLink(context, issue);
  });

  return { ...commit, type, subject, hash, commitLink, notes, references };
};


/**
 *
 */
const getParserOptions = () => ({
  headerPattern: /^(\w*): (.*)$/,
  headerCorrespondence: ['type', 'subject'],

  revertPattern: /^revert:\s([\s\S]*?)\s*Revert commit (\w*)/,
  revertCorrespondence: ['header', 'hash'],

  fieldPattern: /^-(.*?)-$/,

  noteKeywords: [
    'BREAKING CHANGE',
    'BREAKING CHANGES',
    'DEPRECATING CHANGE',
    'DEPRECATING CHANGES',
  ],
});


/**
 *
 */
const getWriterOptions = config => ({
  transform: transformCommit(getTypeMapping()),
  mainTemplate: getTemplate(),
  groupBy: false,

  finalizeContext: (...args) => finalizeContext(config.writerOpts.finalizeContext(...args)),

  noteGroupsSort: (a, b) => b.title.localeCompare(a.title),
  notesSort: () => 1,
  commitsSort: () => 1,
});


/**
 *
 */
const getRecommendedBump = (commits) => {
  const MAJOR_LEVEL = 0;
  const MINOR_LEVEL = 1;
  const PATCH_LEVEL = 2;

  let level = PATCH_LEVEL;

  commits.forEach((commit) => {
    if (isBreakingChange(commit)) {
      level = MAJOR_LEVEL;
    }
    else if (commit.type === 'feat' && level === PATCH_LEVEL) {
      level = MINOR_LEVEL;
    }
  });

  return level;
};


/**
 *
 */
export default getDefaultConfig().then(config => ({
  parserOpts: getParserOptions(),
  writerOpts: getWriterOptions(config),
  whatBump: getRecommendedBump,
  releaseCommitMessage: 'release: Publish version %s',
}));

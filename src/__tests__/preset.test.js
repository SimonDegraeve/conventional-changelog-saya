/**
 *
 */
import preset from '../preset';


/**
 *
 */
const createCommit = (options = {}) => ({
  type: 'feat',
  subject: 'Add feature 1',
  merge: null,
  header: 'feat: Add feature 1',
  body: null,
  footer: null,
  notes: [],
  references: [],
  mentions: [],
  revert: null,
  hash: 'b754a937bee76e36c679cbeb2520053665279c54',
  gitTags: 'v1.0.0',
  committerDate: '1970-01-01',
  ...options,
});


/**
 *
 */
const createContext = (options = {}) => ({
  commit: 'commit',
  issue: 'issues',
  date: '1970-01-01',
  version: '1.0.0',
  host: 'https://github.com',
  owner: 'my-user',
  repository: 'my-module',
  repoUrl: 'https://github.com/my-user/my-module',
  packageData: {
    name: 'my-module',
    version: '1.0.0',
    repository: {
      type: 'git',
      url: 'git+https://github.com/my-user/my-module.git',
    },
    bugs: {
      url: 'https://github.com/my-user/my-module/issues',
    },
    readme: 'ERROR: No README data found!',
    homepage: 'https://github.com/my-user/my-module#readme',
    _id: 'my-module@1.0.0',
  },
  gitSemverTags: [],
  linkReferences: true,
  ...options,
});


/**
 *
 */
describe('writer', () => {
  it('filters invalid commit type', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({ type: 'unknown' });
    const result = writerOpts.transform(commit, createContext());
    expect(result).not.toBeDefined();
  });

  it('filters not visible commit type', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({ type: 'extra' });
    const result = writerOpts.transform(commit, createContext());
    expect(result).not.toBeDefined();
  });

  it('normalizes commit type', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({ type: 'feat' });
    const result = writerOpts.transform(commit, createContext());
    expect(result.type).toBe('Feature');
  });

  it('normalizes commit type', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({ type: 'feat' });
    const result = writerOpts.transform(commit, createContext());
    expect(result.type).toBe('Feature');
  });

  it('normalizes commit type with breaking change', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({ type: 'fix', 'breaking-change': '' });
    const result = writerOpts.transform(commit, createContext());
    expect(result.type).toBe('Bugfix/Breaking');
  });

  it('normalizes commit type with deprecating change', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({ type: 'fix', 'deprecating-change': '' });
    const result = writerOpts.transform(commit, createContext());
    expect(result.type).toBe('Bugfix/Deprecating');
  });

  it('normalizes commit type with breaking and deprecating change', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({ type: 'fix', 'breaking-change': '', 'deprecating-change': '' });
    const result = writerOpts.transform(commit, createContext());
    expect(result.type).toBe('Bugfix/Deprecating/Breaking');
  });

  it('normalizes commit notes', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({
      notes: [{ title: 'BREAKING CHANGES', text: 'Breaking change 1\n' }],
    });
    const result = writerOpts.transform(commit, createContext());
    expect(result.notes[0]).toEqual({ title: 'Breaking Changes', text: 'Breaking change 1\n  ' });
  });

  it('normalizes commit hash', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({ hash: '1234567890' });
    const result = writerOpts.transform(commit, createContext());
    expect(result.hash).toBe('1234567');
  });

  it('normalizes empty commit hash', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({ hash: null });
    const result = writerOpts.transform(commit, createContext());
    expect(result.hash).toBe('');
  });

  it('links references in subject', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({ subject: 'Change something (#3)' });
    const result = writerOpts.transform(commit, createContext());
    expect(result.subject).toBe(
      'Change something ([#3](https://github.com/my-user/my-module/issues/3))'
    );
  });

  it('links reference actions in subject', async () => {
    const { writerOpts } = await preset;
    const commit = createCommit({
      subject: 'Change something, close #3',
      references: [
        {
          action: 'closes',
          owner: null,
          repository: null,
          issue: '3',
          raw: '#3',
          prefix: '#',
        },
        {
          action: 'closes',
          owner: null,
          repository: null,
          issue: '4',
          raw: '#4',
          prefix: '#',
        },
      ],
    });
    const result = writerOpts.transform(commit, createContext());
    expect(result.subject).toBe(
      'Change something, close [#3](https://github.com/my-user/my-module/issues/3)'
    );
    expect(result.references.length).toBe(1);
  });

  it('modifies context', async () => {
    const { writerOpts } = await preset;
    const result = writerOpts.finalizeContext({ extraContext: 'ok' }, {}, [], undefined, []);
    expect(result.extraContext).toBe('ok');
  });

  it('adds comparison link ', async () => {
    const { writerOpts } = await preset;
    const result = writerOpts.finalizeContext({
      version: '1.0.0',
      currentTag: '1.0.0',
      previousTag: '0.0.1',
    }, {}, [], undefined, []);
    expect(result).toEqual({
      version: '1.0.0',
      currentTag: '1.0.0',
      previousTag: '0.0.1',
      versionLink: '[1.0.0](/compare/0.0.1...1.0.0)',
      linkCompare: true,
    });
  });

  it('skips comparison link ', async () => {
    const { writerOpts } = await preset;
    const result = writerOpts.finalizeContext({
      version: '1.0.0',
      linkCompare: false,
    }, {}, [], undefined, []);
    expect(result.versionLink).toBe('1.0.0');
  });

  it('sorts commits in reverse order', async () => {
    const { writerOpts } = await preset;
    const result = ['a', 'b'].sort(writerOpts.commitsSort);
    expect(result).toEqual(['b', 'a']);
  });

  it('sorts notesGroup in reverse title alphabetical order', async () => {
    const { writerOpts } = await preset;
    const result = [{ title: 'a' }, { title: 'b' }].sort(writerOpts.noteGroupsSort);
    expect(result).toEqual([{ title: 'b' }, { title: 'a' }]);
  });

  it('sorts notes in reverse order', async () => {
    const { writerOpts } = await preset;
    const result = ['a', 'b'].sort(writerOpts.notesSort);
    expect(result).toEqual(['b', 'a']);
  });
});


/**
 *
 */
describe('whatBump', () => {
  it('recommends a patch version', async () => {
    const { whatBump } = await preset;
    const commit = createCommit({ type: 'fix' });
    const result = whatBump([commit]);
    expect(result).toBe(2);
  });

  it('recommends a minor version', async () => {
    const { whatBump } = await preset;
    const commit = createCommit({ type: 'feat' });
    const result = whatBump([commit]);
    expect(result).toBe(1);
  });

  it('recommends a major version', async () => {
    const { whatBump } = await preset;
    const commit = createCommit({ 'breaking-change': '' });
    const result = whatBump([commit]);
    expect(result).toBe(0);
  });
});

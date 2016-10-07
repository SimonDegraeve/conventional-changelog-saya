/**
 *
 */
import { dir as createDirectory } from 'tmp';
import { exec } from 'child_process';
import { resolve as resolvePath, basename } from 'path';


/**
 *
 */
jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000; // eslint-disable-line no-undef


/**
 *
 */
const createCommand = path => command => new Promise((resolve, reject) => {
  exec(command, { cwd: path }, (error, stdout, stderr) => {
    if (error) {
      return reject(error);
    }
    if (stderr) {
      return reject(stderr);
    }
    return resolve(stdout);
  });
});


/**
 *
 */
const createCommitCommand = command => (message) => {
  const messages = Array.isArray(message) ? message : [message];
  const args = messages.reduce((result, value) => (`${result} --message "${value}"`), '');
  return command(`git commit --allow-empty ${args}`);
};


/**
 *
 */
let fakeHash = 1000000;
const fakeHashList = {};
const replaceHashes = changelog => changelog.replace(/[0-9a-f]{7}/g, hash => (
  fakeHashList[hash] ? fakeHashList[hash] : (fakeHashList[hash] = (fakeHash += 1))
));


/**
 *
 */
const getChangelog = (command, contextOpts) => () => {
  const code = `
    var changelog = require(
     '${resolvePath(__dirname, '../../node_modules/conventional-changelog-core')}'
    );
    var through = require(
     '${resolvePath(__dirname, '../../node_modules/through2')}'
    );
    var mockDate = require(
      '${resolvePath(__dirname, '../../node_modules/mockdate')}'
    );
    var preset = require(
     '${resolvePath(__dirname, '../preset')}'
    );

    mockDate.set(0); // 1970-01-01

    changelog({ config: preset, releaseCount: 0, outputUnreleased: true }, ${JSON.stringify(contextOpts).replace(/"/g, '\\"')})
     .on('error', error =>
       console.error(error)
     )
     .pipe(through((chunk, encoding, callback) => {
       console.log(chunk.toString());
       callback(null, chunk)
     }));
 `;
  return command(`babel-node --eval "${code}"`).then(replaceHashes);
};


/**
 *
 */
const createRepository = ({ withPkg = false, contextOpts = {} } = {}) =>
  new Promise((resolve, reject) => {
    createDirectory({ unsafeCleanup: true }, async (error, path) => {
      if (error) {
        return reject(error);
      }

      const command = createCommand(path);
      await command('git init');

      if (withPkg) {
        const pkg = JSON.stringify({
          name: 'my-module',
          version: '1.0.0',
          repository: {
            type: 'git',
            url: 'git+https://github.com/my-user/my-module',
          },
        });

        await command(`echo '${pkg}' > package.json`);
      }

      return resolve({
        path,
        command,
        name: basename(path),
        commit: createCommitCommand(command),
        changelog: getChangelog(command, contextOpts),
      });
    });
  });


/**
 *
 */
describe('preset integration', () => {
  it('works with no package.json', async () => {
    const { commit, changelog } = await createRepository();
    await commit('extra: Initialize commit');
    const result = await changelog();
    expect(result).toMatchSnapshot();
  });

  it('works with a package.json', async () => {
    const { commit, changelog } = await createRepository({ withPkg: true });
    await commit('extra: Initialize commit');
    const result = await changelog();
    expect(result).toMatchSnapshot();
  });

  it('outputs only commit with a valid type', async () => {
    const { commit, changelog } = await createRepository({ withPkg: true });
    await commit('extra: Initialize commit');
    await commit('Random commit');
    await commit('add: Add feature 1');
    await commit('fix: Fix bug 1');
    const result = await changelog();
    expect(result).toMatchSnapshot();
  });

  it('outputs breaking and deprecating changes', async () => {
    const { commit, changelog } = await createRepository({ withPkg: true });
    await commit(['add: Add feature 1', 'BREAKING CHANGE: This is a breaking change 1']);
    await commit(['add: Add feature 2', 'DEPRECATING CHANGE: This is a deprecating change 1']);
    await commit(['add: Add feature 3', '-breaking-change-']);
    await commit(['add: Add feature 4', '-deprecating-change-']);
    const result = await changelog();
    expect(result).toMatchSnapshot();
  });

  it('outputs linked references', async () => {
    const { commit, changelog } = await createRepository({ withPkg: true });
    await commit(['fix: Fix bug #1']);
    const result = await changelog();
    expect(result).toMatchSnapshot();
  });

  it('outputs comparison links', async () => {
    const { commit, changelog } = await createRepository({ withPkg: true, contextOpts: { previousTag: '0.0.5' } });
    await commit('add: Add feature 1');
    const result = await changelog();
    expect(result).toMatchSnapshot();
  });
});

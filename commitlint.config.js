export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'revert',
        'build',
        'ci',
      ],
    ],
    'subject-case': [0], // 한글 / 다양한 case 허용
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200],
  },
}

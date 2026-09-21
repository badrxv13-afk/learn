const { loadSubjectProfiles } = require('./universal_engine');
const { processSubject } = require('./subject_builder');

const subjectArg = process.argv[2] || 'الرياضيات';

(async () => {
  const profiles = loadSubjectProfiles();
  const profile = profiles[subjectArg];
  if (!profile) {
    console.error(`Profile not found for: ${subjectArg}`);
    console.log('Available:', Object.keys(profiles));
    process.exit(1);
  }

  await processSubject(profile, { forceReharvest: true });
})();

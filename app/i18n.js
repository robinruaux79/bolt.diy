import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
    // detect user language
    // learn more: https://github.com/i18next/i18next-browser-languageDetector
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next.
    .use(initReactI18next)
    // init i18next
    // for all options read: https://www.i18next.com/overview/configuration-options
    .init({
        debug: false,
        fallbackLng: 'fr',
        keySeparator: false,
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        resources: {
            fr: {
                translation : {
                    'signature_zero': 'Aucune signature',
                    'signature_one': '<0>{{count}}</0> signature',
                    'signature_other': '<0>{{count}}</0> signatures',
                    'vote_zero': 'Aucun vote',
                    'vote_one': '<0>{{count}}</0> vote',
                    'vote_other': '<0>{{count}}</0> votes',
                }
            },
            en: {
                translation: {
                    'links.recent_polls': 'Recent polls',
                    'links.popular_polls': 'Popular',
                    'links.created_polls': 'Created polls',
                    'links.poll_generator': 'Poll generator tool',
                    'links.legals': 'Legals',
                    'links.cgu': 'Terms of service',
                    'poll': 'Poll',
                    'poll_petition': 'Petition',
                    'poll_multiple': 'Poll with multiple answers',
                    'poll_percent': 'Gauge poll (%)',
                    'poll_private': 'Private poll',
                    'startsAt': 'Starts at {{startsAt}}',
                    'endsAt': 'Ends at {{endsAt}}',
                    'finalize': 'Finalize',
                    'slogan': 'Make your voice heard!',
                    'hosting': 'Hosting',
                    'publisher': 'Publisher',
                    'petition': 'petition',
                    'sign_petition': 'Sign petition',
                    'has_signed': 'Has signed !',
                    'has_voted': 'Voted !',
                    'copy_link': 'Copy link',
                    'gauges': 'gauges',
                    'signature_zero': 'No signature',
                    'signature_one': '<0>{{count}}</0> signature',
                    'signature_other': '<0>{{count}}</0> signatures',
                    'vote_zero': 'No vote',
                    'vote_one': '<0>{{count}}</0> vote',
                    'vote_other': '<0>{{count}}</0> votes',
                    'multiple_choices': 'multiple choices',
                    'share_on_social_networks': 'Share on social networks',
                    'available_palettes': 'Color palettes avaiable',
                    'pollform.answer': 'Answer',
                    'pollform.add_answer': 'Add answer',
                    'pollform.invalidPoll': 'Invalid poll or daily quota exceeded ({{maxPollsPerUser}} max.)',
                    'cgu.nom_site': 'Hereinafter called the Site the <1>Vox Populi<1>vs</1></1> website, its engine and its content.',
                    'cgu.nom_editor': 'Hereinafter referred to as the Publisher, the natural or legal person indicated on the Legal Notices page.',
                    'cgu.nom_services': 'Hereinafter referred to as the Services are all the services offered by the <1>VoxPopuli<1>vs</1></1> website and the Publisher.',
                    'cgu.par_creation': 'The vote creation service allows you to add a new poll or petition for everyone to see on the Site. It will then be accessible by the Recent Polls (in order of creation) and Popular (in order of number of votes) sections. A petition requires signatures, unlike surveys which count votes.',
                    'cgu.par_vote_service': 'The voting service uses the Google account connection and creates secure access for vote counting (compressed data, CSRF protection, anonymous votes). Authentication by France Connect would be more effective but this is reserved for associations and companies.',
                    'cgu.editor_implication': 'The Services operate thanks to the involvement of the Publisher. It reserves the right to deactivate the Services as it sees fit depending on the situation (financial, legal, etc.)',
                    'cgu.user_responsibility': 'Your personal responsibility is incurred when you write content on the website, such as new surveys or petitions.',
                    'cgu.respect_vote_system':'Respect the voting system:',
                    'cgu.fraudulent':'any fraudulent or malicious content will be immediately removed from the Site, and the author will be banned from the voting system, except in the case of account theft.',
                    'cgu.abuse': 'any abusive use of the Site and Services will be subject to temporary IP blocking',
                    'cgu.google_services': 'Please also respect the <0>terms of use</0> of Google Accounts authentication services',
                    'links.credits': 'Credits',
                    'credits.votes': 'Vox Populi lives thanks to your <0>{{totalVotes}}</0> votes, <1>{{totalUsers}}</1> of you participated.<br />You have created <2>{{totalPolls}}</2> polls and petitions, thank you!',
                    'credits.content': 'Published by anonympins. Thanks to pojok for the megaphone.',
                }
            }
        }
    });

export default i18n;
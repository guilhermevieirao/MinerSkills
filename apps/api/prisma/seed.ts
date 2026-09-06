import { fakerPT_BR as faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { rm, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DEFAULT_MEMBER_TAGS, GENERATIONS, AGENDA_KINDS } from '@minerskills/shared';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';
import { uniquePostSlug, uniqueEncyclopediaSlug } from '../src/lib/slug.js';
import { UPLOAD_DIRS } from '../src/middleware/upload.js';
import { seedImage } from './seed-images.js';

faker.seed(10019);

const isTest = env.SEED_MODE === 'test';
const N = {
  posts: isTest ? 3 : 12,
  gallery: isTest ? 6 : 30,
  members: isTest ? 6 : 21,
  robots: isTest ? 1 : 3,
  forumTopics: isTest ? 4 : 16,
  awards: isTest ? 3 : 10,
  agenda: isTest ? 4 : 12,
};

let picsumSeed = 10;
const nextPicsum = () => (picsumSeed = (picsumSeed + 7) % 1000) + 1;

async function clearAll() {
  // ordem segura de FKs (filhos primeiro)
  await prisma.postMedia.deleteMany();
  await prisma.postYoutube.deleteMany();
  await prisma.postLink.deleteMany();
  await prisma.quizOption.deleteMany();
  await prisma.quizScore.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.encyclopediaTag.deleteMany();
  await prisma.memberTag.deleteMany();
  await prisma.forumReply.deleteMany();
  await prisma.forumTopic.deleteMany();
  await prisma.galleryPhoto.deleteMany();
  await prisma.timelineItem.deleteMany();
  await prisma.contentBlock.deleteMany();
  await prisma.agendaEvent.deleteMany();
  await prisma.award.deleteMany();
  await prisma.socialLink.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.post.deleteMany();
  await prisma.encyclopediaEntry.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.admin.deleteMany();

  // limpa arquivos de mídia antigos do seed
  for (const dir of [UPLOAD_DIRS.images, UPLOAD_DIRS.thumbs]) {
    const files = await readdir(dir).catch(() => [] as string[]);
    await Promise.all(
      files
        .filter((f) => f.startsWith('seed_'))
        .map((f) => rm(resolve(dir, f), { force: true })),
    );
  }
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await prisma.admin.create({
    data: { email: env.ADMIN_EMAIL, name: env.ADMIN_NAME, passwordHash },
  });
  console.log(`  ✓ admin: ${env.ADMIN_EMAIL}`);
}

async function seedContentBlocks() {
  const landingHero = await seedImage({
    label: 'MinerSkills',
    seed: 1,
    picsumId: 1069,
    alt: 'Equipe MinerSkills em competição',
    width: 1600,
    height: 900,
  });

  const landing = [
    {
      key: 'hero',
      order: 0,
      title: 'MINERSKILLS',
      subtitle: '#10019 · FIRST Robotics Competition',
      body: 'Robótica de porte industrial feita por estudantes mineiros. Escavamos conhecimento, construímos o futuro.',
      mediaId: landingHero.id,
    },
    {
      key: 'about',
      order: 1,
      title: 'Quem Somos',
      subtitle: 'Equipe #10019 — Belo Horizonte / Contagem, MG',
      body: 'A MinerSkills é uma renomada equipe mineira de robótica da FIRST Robotics Competition (FRC), formada por alunos da Escola SESI General Onésimo Becker de Araújo (Belo Horizonte) e do SENAI Euvaldo Lodi (Contagem). Com forte atuação em competições STEM, fomos premiados como Rising All-Star e somos patrocinados pela FIEMG. Nossos estudantes dedicam mais de 12 horas semanais ao planejamento, prototipagem e execução de robôs de porte industrial.',
      mediaId: null,
    },
    {
      key: 'frc',
      order: 2,
      title: 'O que é a FRC',
      subtitle: 'FIRST Robotics Competition',
      body: 'A FIRST Robotics Competition é a principal liga de robótica para o ensino médio no mundo. A cada temporada, um novo desafio de jogo é revelado e as equipes têm poucas semanas para projetar, construir e programar um robô robusto capaz de competir em partidas intensas ao lado e contra outras equipes.',
      mediaId: null,
    },
    {
      key: 'first',
      order: 3,
      title: 'A FIRST',
      subtitle: 'For Inspiration and Recognition of Science and Technology',
      body: 'Fundada em 1989 por Dean Kamen, a FIRST é uma organização sem fins lucrativos que inspira jovens a se tornarem líderes em ciência e tecnologia. Seus valores — como Gracious Professionalism e Coopertition — colocam a cooperação e o respeito no centro da competição.',
      mediaId: null,
    },
    {
      key: 'stem',
      order: 4,
      title: 'Educação STEM',
      subtitle: 'Science, Technology, Engineering & Mathematics',
      body: 'Mais do que construir robôs, a MinerSkills forma pessoas. A metodologia STEM integra ciência, tecnologia, engenharia e matemática a habilidades de gestão, comunicação e trabalho em equipe — preparando os estudantes para os desafios reais do mercado e da vida.',
      mediaId: null,
    },
    { key: 'stat_hours', order: 5, title: '12+', subtitle: 'Horas semanais dedicadas', body: null, mediaId: null },
    { key: 'stat_team', order: 6, title: '#10019', subtitle: 'Número oficial da equipe', body: null, mediaId: null },
    { key: 'stat_members', order: 7, title: `${N.members}+`, subtitle: 'Membros ativos', body: null, mediaId: null },
    { key: 'stat_award', order: 8, title: 'Rising', subtitle: 'All-Star Award', body: null, mediaId: null },
    {
      key: 'cta',
      order: 9,
      title: 'Faça parte da mina',
      subtitle: 'As inscrições para o processo seletivo abrem todos os anos.',
      body: 'Junte-se a uma equipe que transforma estudantes em engenheiros, líderes e inovadores.',
      mediaId: null,
    },
  ];

  const historia = [
    {
      key: 'intro',
      order: 0,
      title: 'Nossa História',
      subtitle: 'Da primeira faísca à bancada de competição',
      body: 'A trajetória da MinerSkills é feita de suor, parafusos e muita determinação. Conheça os marcos que construíram a nossa equipe.',
      mediaId: null,
    },
    {
      key: 'quote',
      order: 1,
      title: null,
      subtitle: null,
      body: 'Disciplina vence talento quando talento não tem disciplina.',
      mediaId: null,
    },
  ];

  const comoEntrar = [
    {
      key: 'hero',
      order: 0,
      title: 'Como Entrar na MinerSkills',
      subtitle: 'Processo Seletivo #10019',
      body: 'Não é preciso ser um gênio da robótica para começar — é preciso vontade de aprender. Veja como funciona o nosso processo seletivo.',
      mediaId: null,
    },
    { key: 'step_1', order: 1, title: 'Inscrição', subtitle: 'Etapa 1', body: 'Preencha o formulário de inscrição divulgado nas nossas redes sociais quando o processo seletivo estiver aberto.', mediaId: null },
    { key: 'step_2', order: 2, title: 'Dinâmica em Grupo', subtitle: 'Etapa 2', body: 'Participe de dinâmicas que avaliam trabalho em equipe, criatividade e resolução de problemas — não decoreba.', mediaId: null },
    { key: 'step_3', order: 3, title: 'Entrevista', subtitle: 'Etapa 3', body: 'Converse com os mentores e membros sobre seus interesses, disponibilidade e a área em que deseja atuar.', mediaId: null },
    { key: 'step_4', order: 4, title: 'Bem-vindo à Mina', subtitle: 'Etapa 4', body: 'Aprovado? Você inicia o período de integração e treinamento nas subequipes: mecânica, eletrônica, programação, CAD, marketing e mais.', mediaId: null },
    {
      key: 'requisitos',
      order: 5,
      title: 'Requisitos',
      subtitle: 'O que você precisa',
      body: 'Estar matriculado no ensino médio, ter disponibilidade de pelo menos 12 horas semanais e — o mais importante — vontade de aprender e colaborar.',
      mediaId: null,
    },
    {
      key: 'cta',
      order: 6,
      title: 'Ainda com dúvidas?',
      subtitle: 'Fale com a gente',
      body: 'Acompanhe nossas redes sociais e fique por dentro das datas do próximo processo seletivo.',
      mediaId: null,
    },
  ];

  for (const b of landing) await prisma.contentBlock.create({ data: { page: 'landing', ...b } });
  for (const b of historia) await prisma.contentBlock.create({ data: { page: 'historia', ...b } });
  for (const b of comoEntrar) await prisma.contentBlock.create({ data: { page: 'como-entrar', ...b } });
  console.log('  ✓ blocos de conteúdo (landing, historia, como-entrar)');
}

async function seedTimeline() {
  const items = [
    { year: 2023, title: 'Nasce a MinerSkills', description: 'A equipe #10019 é fundada com alunos do SESI e do SENAI, unindo paixão por tecnologia e vontade de competir.' },
    { year: 2023, title: 'Primeiro protótipo', description: 'A subequipe de mecânica monta o primeiro chassi de testes e a programação dá os primeiros comandos ao robô.' },
    { year: 2024, title: 'Estreia em competição', description: 'A MinerSkills participa da sua primeira temporada oficial da FRC, enfrentando equipes de todo o país.' },
    { year: 2024, title: 'Rising All-Star', description: 'O trabalho da equipe é reconhecido com o prêmio Rising All-Star, um marco para uma equipe tão jovem.' },
    { year: 2024, title: 'Patrocínio FIEMG', description: 'A Federação das Indústrias do Estado de Minas Gerais passa a apoiar a equipe, viabilizando novos projetos.' },
    { year: 2025, title: 'Nova temporada, novo robô', description: 'Com mais experiência, a equipe encara o desafio da temporada com um robô mais robusto e confiável.' },
    { year: 2025, title: 'Expansão das subequipes', description: 'Marketing, CAD e eletrônica crescem, profissionalizando cada área da equipe.' },
    { year: 2026, title: 'O futuro se constrói agora', description: 'A MinerSkills segue formando estudantes e mirando voos cada vez mais altos na robótica competitiva.' },
  ];
  const chosen = isTest ? items.slice(0, 4) : items;
  for (let i = 0; i < chosen.length; i++) {
    await prisma.timelineItem.create({ data: { ...chosen[i]!, order: i } });
  }
  console.log(`  ✓ timeline (${chosen.length} marcos)`);
}

async function seedPosts() {
  for (let i = 0; i < N.posts; i++) {
    const title = faker.helpers.arrayElement([
      `MinerSkills conquista destaque em ${faker.location.city()}`,
      `Bastidores da construção do robô — semana ${i + 1}`,
      `Workshop de ${faker.helpers.arrayElement(['programação', 'CAD', 'eletrônica', 'mecânica'])} reúne novos membros`,
      `Reflexões da temporada: o que aprendemos`,
      `Parceria com ${faker.company.name()} impulsiona a equipe`,
    ]);
    const cover = await seedImage({
      label: 'Blog',
      seed: 100 + i,
      picsumId: nextPicsum(),
      alt: title,
    });
    const extraCount = faker.number.int({ min: 0, max: isTest ? 1 : 3 });
    const extraMedia = await Promise.all(
      Array.from({ length: extraCount }, (_, k) =>
        seedImage({ label: 'Foto', seed: 200 + i * 10 + k, picsumId: nextPicsum(), alt: 'Foto do post' }),
      ),
    );

    const slug = await uniquePostSlug(title);
    const published = i > 0 || !isTest; // deixa 1 rascunho no modo full
    await prisma.post.create({
      data: {
        title,
        slug,
        excerpt: faker.lorem.sentences(2),
        contentHtml: `<p>${faker.lorem.paragraphs(3, '</p><p>')}</p><h3>${faker.lorem.sentence(4)}</h3><p>${faker.lorem.paragraphs(2, '</p><p>')}</p>`,
        published: i === 0 && !isTest ? false : published,
        publishedAt: i === 0 && !isTest ? null : faker.date.recent({ days: 200 }),
        coverId: cover.id,
        media: { create: extraMedia.map((m, order) => ({ mediaId: m.id, order })) },
        youtube:
          faker.number.int({ min: 0, max: 2 }) > 1
            ? { create: [{ youtubeId: 'dQw4w9WgXcQ', title: 'Vídeo da equipe', order: 0 }] }
            : undefined,
        links:
          faker.datatype.boolean()
            ? { create: [{ label: 'Saiba mais', url: 'https://www.firstinspires.org', order: 0 }] }
            : undefined,
      },
    });
  }
  console.log(`  ✓ posts (${N.posts})`);
}

async function seedGallery() {
  for (let i = 0; i < N.gallery; i++) {
    const media = await seedImage({
      label: 'Galeria',
      seed: 500 + i,
      picsumId: nextPicsum(),
      alt: `Foto da galeria ${i + 1}`,
      width: faker.helpers.arrayElement([1200, 900, 1400]),
      height: faker.helpers.arrayElement([800, 1200, 900]),
    });
    await prisma.galleryPhoto.create({
      data: {
        mediaId: media.id,
        caption: faker.datatype.boolean() ? faker.lorem.sentence(5) : null,
        order: i,
      },
    });
  }
  console.log(`  ✓ galeria (${N.gallery} fotos)`);
}

async function seedQuiz() {
  const questions: {
    question: string;
    explanation?: string;
    options: { text: string; correct?: boolean }[];
  }[] = [
    {
      question: 'O que significa a sigla FIRST?',
      explanation: 'FIRST = For Inspiration and Recognition of Science and Technology.',
      options: [
        { text: 'For Inspiration and Recognition of Science and Technology', correct: true },
        { text: 'Federation of International Robotics Science Teams' },
        { text: 'Future Innovators in Robotics, Science and Tech' },
        { text: 'First International Robotics Sports Tournament' },
      ],
    },
    {
      question: 'Qual é o número oficial da equipe MinerSkills?',
      options: [{ text: '10019', correct: true }, { text: '1019' }, { text: '10091' }, { text: '19100' }],
    },
    {
      question: 'Quem fundou a FIRST?',
      explanation: 'A FIRST foi fundada pelo inventor Dean Kamen.',
      options: [{ text: 'Dean Kamen', correct: true }, { text: 'Elon Musk' }, { text: 'Woodie Flowers' }, { text: 'Nikola Tesla' }],
    },
    {
      question: 'Em que ano a FIRST foi fundada?',
      options: [{ text: '1989', correct: true }, { text: '1999' }, { text: '2005' }, { text: '1975' }],
    },
    {
      question: 'O que significa FRC?',
      options: [
        { text: 'FIRST Robotics Competition', correct: true },
        { text: 'Federal Robotics Challenge' },
        { text: 'Fast Robot Construction' },
        { text: 'FIRST Robot Camp' },
      ],
    },
    {
      question: 'Qual estado brasileiro a MinerSkills representa?',
      explanation: 'A equipe é de Belo Horizonte e Contagem, em Minas Gerais.',
      options: [{ text: 'Minas Gerais', correct: true }, { text: 'São Paulo' }, { text: 'Rio de Janeiro' }, { text: 'Bahia' }],
    },
    {
      question: 'Qual instituição patrocina a MinerSkills?',
      options: [{ text: 'FIEMG', correct: true }, { text: 'FIESP' }, { text: 'CNI' }, { text: 'BNDES' }],
    },
    {
      question: 'O que significa STEM?',
      options: [
        { text: 'Science, Technology, Engineering and Mathematics', correct: true },
        { text: 'Science, Teaching, Engineering and Management' },
        { text: 'Systems, Technology, Electronics and Mechanics' },
        { text: 'Space, Technology, Engineering and Math' },
      ],
    },
    {
      question: 'Qual prêmio de destaque a MinerSkills recebeu?',
      options: [{ text: 'Rising All-Star', correct: true }, { text: 'Chairman’s Award' }, { text: 'Winner Award' }, { text: 'Rookie of the Year' }],
    },
    {
      question: 'Qual valor da FIRST enfatiza cooperação mesmo entre adversários?',
      explanation: 'Coopertition e Gracious Professionalism são valores centrais da FIRST.',
      options: [{ text: 'Coopertition', correct: true }, { text: 'Competition First' }, { text: 'Win at all costs' }, { text: 'Solo Play' }],
    },
    {
      question: 'Quais escolas formam a base da MinerSkills?',
      options: [
        { text: 'SESI e SENAI', correct: true },
        { text: 'USP e Unicamp' },
        { text: 'IFMG e CEFET' },
        { text: 'UFMG e PUC' },
      ],
    },
    {
      question: 'Aproximadamente quanto tempo as equipes têm para construir o robô na temporada?',
      explanation: 'A temporada de construção da FRC dura cerca de seis semanas.',
      options: [{ text: 'Cerca de 6 semanas', correct: true }, { text: 'Cerca de 6 meses' }, { text: 'Um ano inteiro' }, { text: 'Apenas 1 semana' }],
    },
  ];

  const chosen = isTest ? questions.slice(0, 5) : questions;
  for (let i = 0; i < chosen.length; i++) {
    const q = chosen[i]!;
    const options = faker.helpers.shuffle(q.options);
    await prisma.quizQuestion.create({
      data: {
        question: q.question,
        explanation: q.explanation ?? null,
        active: true,
        order: i,
        options: {
          create: options.map((o, order) => ({
            text: o.text,
            isCorrect: !!o.correct,
            order,
          })),
        },
      },
    });
  }

  // leaderboard fictício
  if (!isTest) {
    for (let i = 0; i < 12; i++) {
      await prisma.quizScore.create({
        data: {
          nickname: faker.internet.username().slice(0, 18),
          score: faker.number.int({ min: 4, max: chosen.length }),
          totalQuestions: chosen.length,
          durationMs: faker.number.int({ min: 25000, max: 180000 }),
          createdAt: faker.date.recent({ days: 60 }),
        },
      });
    }
  }
  console.log(`  ✓ quiz (${chosen.length} perguntas)`);
}

async function seedMemberTags() {
  // ordem = índice em DEFAULT_MEMBER_TAGS (sem faker: não afeta o determinismo)
  for (let i = 0; i < DEFAULT_MEMBER_TAGS.length; i++) {
    const t = DEFAULT_MEMBER_TAGS[i]!;
    await prisma.memberTag.create({
      data: { key: t.key, label: t.label, icon: t.icon, order: i },
    });
  }
  console.log(`  ✓ tags da equipe (${DEFAULT_MEMBER_TAGS.length})`);
}

async function seedEncyclopedia() {
  const tagKeys = DEFAULT_MEMBER_TAGS.map((t) => t.key);
  const labelByKey = new Map(DEFAULT_MEMBER_TAGS.map((t) => [t.key, t.label]));

  for (let i = 0; i < N.members; i++) {
    const sex = faker.person.sexType();
    const name = faker.person.fullName({ sex });
    const primary = faker.helpers.arrayElement(tagKeys);
    const tags = faker.helpers.arrayElements(
      tagKeys,
      faker.number.int({ min: 1, max: 3 }),
    );
    if (!tags.includes(primary)) tags.push(primary);
    const photo = await seedImage({
      label: name.split(' ')[0] ?? 'Membro',
      seed: 700 + i,
      picsumId: nextPicsum(),
      alt: name,
      width: 800,
      height: 1000,
    });
    const slug = await uniqueEncyclopediaSlug(name);
    await prisma.encyclopediaEntry.create({
      data: {
        kind: 'member',
        name,
        slug,
        role: labelByKey.get(primary) ?? primary,
        generation: faker.helpers.arrayElement([...GENERATIONS]),
        age: faker.number.int({ min: 15, max: 19 }),
        about: faker.lorem.paragraphs(2, '\n\n'),
        quote: faker.datatype.boolean() ? faker.lorem.sentence(8) : null,
        isFormer: faker.datatype.boolean({ probability: 0.25 }),
        order: i,
        photoId: photo.id,
        tags: { create: [...new Set(tags)].map((tag) => ({ tag })) },
      },
    });
  }

  const robotNames = ['R.O.B. Reefscape', 'R.O.B. Crescendo', 'R.O.B. Rebuilt'];
  for (let i = 0; i < N.robots; i++) {
    const name = robotNames[i] ?? `R.O.B. ${i + 1}`;
    const photo = await seedImage({
      label: 'Robô',
      seed: 900 + i,
      picsumId: nextPicsum(),
      alt: name,
      width: 900,
      height: 1000,
    });
    const slug = await uniqueEncyclopediaSlug(name);
    await prisma.encyclopediaEntry.create({
      data: {
        kind: 'robot',
        name,
        slug,
        role: 'Robô de Competição',
        season: `Temporada ${2024 + i}`,
        about: faker.lorem.paragraphs(2, '\n\n'),
        quote: null,
        isFormer: i < N.robots - 1,
        order: 100 + i,
        photoId: photo.id,
        tags: { create: [] },
      },
    });
  }
  console.log(`  ✓ equipe (${N.members} membros + ${N.robots} robôs)`);
}

async function seedForum() {
  const statuses = ['approved', 'approved', 'approved', 'pending', 'rejected'] as const;
  for (let i = 0; i < N.forumTopics; i++) {
    const status = faker.helpers.arrayElement(statuses);
    const topic = await prisma.forumTopic.create({
      data: {
        nickname: faker.internet.username().slice(0, 18),
        title: faker.helpers.arrayElement([
          'Como começar na programação do robô?',
          'Dúvida sobre o processo seletivo',
          'Dicas de CAD para iniciantes',
          'Qual linguagem a equipe usa?',
          'Parabéns pelo Rising All-Star!',
          'Como funciona a subequipe de marketing?',
        ]),
        body: faker.lorem.paragraph(),
        status,
        createdAt: faker.date.recent({ days: 90 }),
        moderatedAt: status === 'pending' ? null : faker.date.recent({ days: 80 }),
      },
    });
    if (status === 'approved') {
      const replyCount = faker.number.int({ min: 0, max: 4 });
      for (let r = 0; r < replyCount; r++) {
        const rStatus = faker.helpers.arrayElement(['approved', 'approved', 'pending'] as const);
        await prisma.forumReply.create({
          data: {
            topicId: topic.id,
            nickname: faker.internet.username().slice(0, 18),
            body: faker.lorem.sentences(2),
            status: rStatus,
            createdAt: faker.date.recent({ days: 60 }),
            moderatedAt: rStatus === 'pending' ? null : faker.date.recent({ days: 50 }),
          },
        });
      }
    }
  }
  console.log(`  ✓ fórum (${N.forumTopics} tópicos)`);
}

async function seedAwards() {
  const awards = [
    { title: 'Rising All-Star Award', event: 'FIRST Robotics Competition', year: 2024, highlight: true, description: 'Reconhecimento a equipes jovens que se destacam rapidamente pela dedicação, espírito de equipe e evolução técnica.' },
    { title: 'Destaque Regional STEM', event: 'Feira de Ciências e Tecnologia', year: 2024, highlight: false, description: faker.lorem.sentences(2) },
    { title: 'Menção de Espírito de Equipe', event: 'FRC Off-Season', year: 2025, highlight: false, description: faker.lorem.sentences(2) },
  ];
  for (let i = 0; i < N.awards; i++) {
    const base = awards[i] ?? {
      title: `Conquista ${i + 1}`,
      event: faker.company.name(),
      year: faker.number.int({ min: 2023, max: 2026 }),
      highlight: false,
      description: faker.lorem.sentences(2),
    };
    const media = i < 3 ? await seedImage({ label: 'Prêmio', seed: 1100 + i, picsumId: nextPicsum(), alt: base.title, width: 800, height: 800 }) : null;
    await prisma.award.create({
      data: { ...base, order: i, mediaId: media?.id ?? null },
    });
  }
  console.log(`  ✓ prêmios (${N.awards})`);
}

async function seedAgenda() {
  for (let i = 0; i < N.agenda; i++) {
    const future = i % 2 === 0;
    const startsAt = future
      ? faker.date.soon({ days: 120 })
      : faker.date.recent({ days: 200 });
    await prisma.agendaEvent.create({
      data: {
        title: faker.helpers.arrayElement([
          'Reunião geral da equipe',
          'Regional FRC',
          'Workshop de programação',
          'Processo Seletivo — inscrições',
          'Mentoria de CAD',
          'Apresentação para patrocinadores',
        ]),
        description: faker.lorem.sentences(2),
        location: faker.helpers.arrayElement(['SENAI Euvaldo Lodi, Contagem', 'SESI, Belo Horizonte', 'Online']),
        startsAt,
        endsAt: new Date(startsAt.getTime() + faker.number.int({ min: 1, max: 6 }) * 3600000),
        kind: faker.helpers.arrayElement([...AGENDA_KINDS]),
        published: true,
      },
    });
  }
  console.log(`  ✓ agenda (${N.agenda} eventos)`);
}

async function seedSocial() {
  const links = [
    { platform: 'instagram', label: '@minerskills10019', url: 'https://instagram.com/minerskills10019', order: 0 },
    { platform: 'linkedin', label: 'MinerSkills', url: 'https://www.linkedin.com/company/minerskills', order: 1 },
    { platform: 'youtube', label: 'MinerSkills #10019', url: 'https://youtube.com/@minerskills', order: 2 },
    { platform: 'tiktok', label: '@minerskills', url: 'https://tiktok.com/@minerskills', order: 3 },
    { platform: 'email', label: 'contato@minerskills.com.br', url: 'mailto:contato@minerskills.com.br', order: 4 },
  ];
  for (const l of links) await prisma.socialLink.create({ data: { ...l, active: true } });

  await prisma.setting.createMany({
    data: [
      { key: 'contact_email', value: 'contato@minerskills.com.br' },
      { key: 'team_motto', value: 'Escavamos conhecimento, construímos o futuro.' },
    ],
  });
  console.log('  ✓ redes sociais + settings');
}

async function main() {
  console.log(`🌱 Seed MinerSkills — modo=${env.SEED_MODE}, imagens=${env.SEED_IMAGE_SOURCE}`);
  await clearAll();
  await seedAdmin();
  await seedContentBlocks();
  await seedTimeline();
  await seedPosts();
  await seedGallery();
  await seedQuiz();
  await seedMemberTags();
  await seedEncyclopedia();
  await seedForum();
  await seedAwards();
  await seedAgenda();
  await seedSocial();
  console.log('✅ Seed concluído.');
}

main()
  .catch((err) => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

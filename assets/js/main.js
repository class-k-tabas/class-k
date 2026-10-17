(function () {
  'use strict';

  var FILES = {
    students: 'assets/data/students.csv',
    organization: 'assets/data/organization.csv',
    lessons: 'assets/data/schedule_lesson.csv',
    duty: 'assets/data/schedule_duty.csv',
    gallery: 'assets/data/gallery.csv',
    uniforms: 'assets/data/uniform.csv',
    links: 'assets/data/links.csv'
  };

  var UNIFORM_DIR = 'assets/images/uniforms/';

  var DAY_KEYS = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat'];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function cell(row, index) {
    return String((row && row[index]) || '').trim();
  }

  function parseCsv(raw) {
    var src = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    var rows = [];
    var row = [];
    var field = '';
    var quoted = false;

    for (var i = 0; i < src.length; i++) {
      var ch = src[i];
      if (quoted) {
        if (ch === '"') {
          if (src[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch !== '\r') {
        field += ch;
      }
    }
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function loadCsv(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    }).then(parseCsv);
  }

  function dayKey(label) {
    return String(label || '').toLowerCase().replace(/[^a-z]/g, '');
  }

  function todayInfo() {
    var dow = new Date().getDay();
    var isSchoolData = dow >= 1 && dow <= 5;
    return {
      dow: dow,
      key: isSchoolData ? DAY_KEYS[dow] : null,
      status: isSchoolData ? 'Hari Sekolah' : (dow === 6 ? 'Akhir Pekan' : 'Hari Minggu'),
      note: isSchoolData ? '' : (dow === 6
        ? 'Hari Sabtu, jadwal rutin kelas tidak ditampilkan hari ini.'
        : 'Hari Minggu, tidak ada jadwal kegiatan sekolah hari ini.')
    };
  }

  function todayKey() {
    return todayInfo().key;
  }

  function normalizeName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  }

  function initials(name) {
    var parts = normalizeName(name).split(' ').filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  function parseLinks(rows) {
    var head = -1;
    rows.some(function (row, index) {
      var first = cell(row, 0).toLowerCase();
      if (first === 'label' || first === 'nama' || first === 'platform' || first === 'situs') {
        head = index;
        return true;
      }
      return false;
    });
    if (head === -1) return null;

    var urlCol = -1;
    rows[head].some(function (raw, index) {
      var name = String(raw || '').trim().toLowerCase();
      if (name === 'url' || name === 'link' || name.indexOf('tautan') === 0) {
        urlCol = index;
        return true;
      }
      return false;
    });
    if (urlCol === -1) urlCol = 1;

    var links = [];
    rows.slice(head + 1).forEach(function (row) {
      var label = cell(row, 0);
      if (!label) return;
      links.push({ label: label, url: cell(row, urlCol) });
    });
    return links;
  }

  function parseUniforms(rows) {
    var head = -1;
    rows.some(function (row, index) {
      var first = cell(row, 0).toLowerCase();
      if (first === 'hari' || first === 'day') { head = index; return true; }
      return false;
    });
    if (head === -1) return null;

    var peCol = -1;
    rows[head].some(function (raw, index) {
      var name = String(raw || '').trim().toLowerCase();
      if (name.indexOf('penjaskes') !== -1 || name === 'pe' || name.indexOf('jika') === 0) {
        peCol = index;
        return true;
      }
      return false;
    });

    var byDay = {};
    rows.slice(head + 1).forEach(function (row) {
      var label = cell(row, 0);
      var file = cell(row, 1);
      if (!label || !file) return;
      byDay[dayKey(label)] = { file: file, peFile: peCol > -1 ? cell(row, peCol) : '' };
    });
    return { byDay: byDay };
  }

  function dayHasSubject(lessons, dayName, pattern) {
    if (!lessons || !dayName) return false;
    return lessons.entries.some(function (entry) {
      return !entry.marker && pattern.test(entry.mapel[dayName] || '');
    });
  }

  function findDayName(lessons, key) {
    var found = null;
    lessons.days.some(function (day) {
      if (dayKey(day) === key) { found = day; return true; }
      return false;
    });
    return found;
  }

  // Names of the students on duty today, keyed by normalised name so the student
  // list can tag them without caring about spelling differences.
  function todayDutyNames(duty) {
    var info = todayInfo();
    var map = {};
    if (!duty || !info.key) return map;
    var day = findDayName(duty, info.key);
    if (!day) return map;
    (duty.byDay[day] || []).forEach(function (item) {
      map[normalizeName(item.name)] = true;
    });
    return map;
  }

  function parseStudents(rows) {
    var head = -1;
    rows.some(function (row, index) {
      if (cell(row, 0).toLowerCase().indexOf('absen') !== -1) { head = index; return true; }
      return false;
    });
    if (head === -1) return [];

    var photoCol = -1;
    rows[head].some(function (raw, index) {
      if (String(raw || '').trim().toLowerCase() === 'foto') { photoCol = index; return true; }
      return false;
    });

    var list = [];
    rows.slice(head + 1).forEach(function (row) {
      var no = parseInt(cell(row, 0).replace(/[^0-9]/g, ''), 10);
      var name = cell(row, 1);
      if (!name || isNaN(no)) return;
      list.push({ no: no, name: name, photo: photoCol > -1 ? cell(row, photoCol) : '' });
    });
    list.sort(function (a, b) { return a.no - b.no; });
    return list;
  }

  function parseOrganization(rows) {
    var head = -1;
    rows.some(function (row, index) {
      if (cell(row, 0).toLowerCase() === 'level') { head = index; return true; }
      return false;
    });
    if (head === -1) return { levels: [], roleByName: {} };

    var levels = [];
    var roleByName = {};

    rows.slice(head + 1).forEach(function (row) {
      var level = parseInt(cell(row, 0).replace(/[^0-9]/g, ''), 10);
      var role = cell(row, 1);
      var raw = cell(row, 2).replace(/^\[(.*)\]$/, '$1');
      if (isNaN(level) || (!role && !raw)) return;

      var filled = raw !== '' && !/\bnama\b/i.test(raw);
      var group = null;
      levels.forEach(function (item) { if (item.level === level) group = item; });
      if (!group) { group = { level: level, roles: [] }; levels.push(group); }

      var holder = null;
      group.roles.forEach(function (item) { if (item.role === role) holder = item; });
      if (!holder) { holder = { role: role, names: [] }; group.roles.push(holder); }

      holder.names.push(filled ? raw : '');
      if (filled) roleByName[normalizeName(raw)] = role;
    });

    levels.sort(function (a, b) { return a.level - b.level; });
    return { levels: levels, roleByName: roleByName };
  }

  function parseLessons(rows) {
    var head = -1;
    rows.some(function (row, index) {
      if (cell(row, 0).toLowerCase() === 'jam') { head = index; return true; }
      return false;
    });
    if (head === -1) return null;

    var days = rows[head].slice(1).map(function (raw) { return String(raw || '').trim(); })
      .filter(function (day) { return day !== ''; });

    var entries = [];
    rows.slice(head + 1).forEach(function (row) {
      var time = cell(row, 0);
      if (!time) return;

      var mapel = {};
      var filled = 0;
      days.forEach(function (day, index) {
        var subject = cell(row, index + 1);
        mapel[day] = subject;
        if (subject) filled++;
      });
      if (filled === 0) return;

      var first = cell(row, 1);
      var isBreak = /^(istirahat|istrahat|jeda|break|dhuhur|dzuhur|sholat|jum'at|jumat)/i.test(first);
      entries.push({ time: time, mapel: mapel, marker: isBreak ? (first || 'Istirahat') : '' });
    });

    return { days: days, entries: entries };
  }

  function parseDuty(rows) {
    var head = -1;
    rows.some(function (row, index) {
      if (row.some(function (raw) { return dayKey(raw) === 'senin'; })) { head = index; return true; }
      return false;
    });
    if (head === -1) return { days: [], byDay: {} };

    var days = rows[head].map(function (raw) { return String(raw || '').trim(); })
      .filter(function (day) { return day !== ''; });

    var byDay = {};
    days.forEach(function (day) { byDay[day] = []; });

    var reachedTotal = false;
    rows.slice(head + 1).forEach(function (row) {
      if (/^total/i.test(cell(row, 0))) reachedTotal = true;
      if (reachedTotal) return;
      if (!days.some(function (day, index) { return cell(row, index); })) return;

      days.forEach(function (day, index) {
        var raw = cell(row, index);
        if (!raw) return;
        var match = raw.match(/^(\d+)\s*[.)]\s*(.+)$/);
        byDay[day].push({
          no: match ? parseInt(match[1], 10) : byDay[day].length + 1,
          name: (match ? match[2] : raw).trim()
        });
      });
    });

    return { days: days, byDay: byDay };
  }

  function parseGallery(rows) {
    var head = -1;
    rows.some(function (row, index) {
      var first = cell(row, 0).toLowerCase();
      if (first === 'file' || first === 'nama file' || first === 'foto') { head = index; return true; }
      return false;
    });
    if (head === -1) return [];

    var captionCol = -1;
    rows[head].some(function (raw, index) {
      var name = String(raw || '').trim().toLowerCase();
      if (name === 'keterangan' || name === 'caption') { captionCol = index; return true; }
      return false;
    });

    var items = [];
    rows.slice(head + 1).forEach(function (row) {
      var file = cell(row, 0);
      if (!file) return;
      items.push({ file: file, caption: captionCol > -1 ? cell(row, captionCol) : '' });
    });
    return items;
  }

  function showLoading(host, label) {
    host.textContent = '';
    var box = el('div', 'state state--loading');
    box.setAttribute('role', 'status');
    box.appendChild(el('p', 'state__text', label));
    host.appendChild(box);
  }

  function reloadPage() {
    window.location.reload();
  }

  function showError(host, headline) {
    host.textContent = '';
    var box = el('div', 'state state--error');
    box.setAttribute('role', 'alert');
    box.appendChild(el('p', 'state__headline', headline));

    var why = el('p', 'state__why');
    why.textContent = 'Gagal memuat data dari peladen. Silakan periksa kembali sambungan internet atau muat ulang halaman ini.';
    box.appendChild(why);

    var button = el('button', 'btn', 'Muat Ulang Halaman');
    button.type = 'button';
    button.addEventListener('click', reloadPage);
    box.appendChild(button);
    host.appendChild(box);
  }

  function showEmpty(host, headline, text, actionLabel, onAction) {
    host.textContent = '';
    var box = el('div', 'state state--empty');
    box.appendChild(el('p', 'state__headline', headline));
    if (text) box.appendChild(el('p', 'state__text', text));

    if (actionLabel && onAction) {
      var button = el('button', 'btn', actionLabel);
      button.type = 'button';
      button.addEventListener('click', onAction);
      box.appendChild(button);
    }
    host.appendChild(box);
  }

  function buildAvatar(student) {
    var box = el('div', 'avatar');
    box.setAttribute('aria-hidden', 'true');
    if (student.photo) {
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.addEventListener('error', function () {
        box.textContent = initials(student.name);
        if (img.parentNode === box) box.removeChild(img);
      });
      img.src = 'assets/images/students/' + student.photo;
      box.appendChild(img);
    } else {
      box.textContent = initials(student.name);
    }
    return box;
  }

  function studentCard(student, roleByName, dutyNames) {
    var card = el('article', 'card');
    card.appendChild(el('span', 'card__no', String(student.no)));
    card.appendChild(buildAvatar(student));

    var body = el('div', 'card__body');
    body.appendChild(el('p', 'card__name', student.name));

    var role = roleByName[normalizeName(student.name)];
    if (role) body.appendChild(el('p', 'card__role', role));
    if (dutyNames[normalizeName(student.name)]) {
      body.appendChild(el('p', 'card__duty', 'Piket'));
    }
    card.appendChild(body);
    return card;
  }

  function dayCard(day, isToday, bodyRows, footerText, listTag) {
    var card = el('article', isToday ? 'day day--today' : 'day');
    if (isToday) card.setAttribute('aria-current', 'date');

    var head = el('div', 'day__head');
    head.appendChild(el('h3', 'day__name', day));
    if (isToday) head.appendChild(el('span', 'day__flag', 'Hari Ini'));
    card.appendChild(head);

    var list = el(listTag || 'div', isToday ? 'duties' : 'day__list');
    bodyRows.forEach(function (row) { list.appendChild(row); });
    card.appendChild(list);

    if (footerText) card.appendChild(el('p', 'day__total', footerText));
    return card;
  }

  function lessonLabel(entry, day) {
    var subject = entry.mapel[day] || '';
    return {
      subject: subject,
      label: entry.marker ? (subject || entry.marker) : (subject || 'Kosong')
    };
  }

  function lessonRow(entry, day) {
    var parts = lessonLabel(entry, day);
    var row = el('div', 'lesson' + (entry.marker ? ' lesson--break' : ''));
    row.appendChild(el('p', 'lesson__time', entry.time));
    row.appendChild(el('p', 'lesson__subject' + (parts.subject ? '' : ' lesson__subject--empty'), parts.label));
    return row;
  }

  function readoutRow(entry, day) {
    var parts = lessonLabel(entry, day);
    var row = el('div', 'readout__row' + (entry.marker ? ' readout__row--break' : ''));
    row.appendChild(el('span', 'readout__time', entry.time));
    row.appendChild(el('span', 'readout__subject' + (parts.subject ? '' : ' readout__subject--empty'), parts.label));
    return row;
  }

  function dutyRow(entry) {
    var row = el('li', 'duty');
    row.appendChild(el('span', 'duty__no', String(entry.no)));
    row.appendChild(el('span', 'duty__name', entry.name));
    return row;
  }

  function renderLessons(host, data) {
    if (!data || !data.entries.length) {
      showEmpty(host, 'Jadwal pelajaran belum tersedia', 'Informasi jadwal pelajaran akan segera diperbarui.');
      return;
    }

    var info = todayInfo();
    host.textContent = '';
    data.days.forEach(function (day) {
      var rows = data.entries.map(function (entry) { return lessonRow(entry, day); });
      host.appendChild(dayCard(day, info.key !== null && dayKey(day) === info.key, rows, ''));
    });

    if (info.key === null) {
      var note = el('p', 'state__text');
      note.textContent = info.note;
      host.appendChild(note);
    }
  }

  function renderDuty(host, data) {
    if (!data || !data.days.length) {
      showEmpty(host, 'Jadwal piket belum tersedia', 'Informasi jadwal piket kelas akan segera diperbarui.');
      return;
    }

    var key = todayInfo().key;
    host.textContent = '';
    data.days.forEach(function (day) {
      var entries = data.byDay[day] || [];
      if (!entries.length) {
        host.appendChild(dayCard(day, key !== null && dayKey(day) === key,
          [el('p', 'lesson__subject lesson__subject--empty', 'Belum ada petugas')], ''));
        return;
      }
      var total = entries.length + ' siswa bertugas';
      host.appendChild(dayCard(day, key !== null && dayKey(day) === key, entries.map(dutyRow), total, 'ul'));
    });
  }

  function renderOrganization(host, data) {
    if (!data.levels.length) {
      showEmpty(host, 'Struktur organisasi belum tersedia', 'Informasi struktur kepengurusan kelas akan segera diperbarui.');
      return;
    }

    host.textContent = '';
    var wrap = el('div', 'org');
    data.levels.forEach(function (group) {
      var level = el('section', 'org__level');
      level.appendChild(el('h3', 'org__label', 'Tingkat ' + group.level));

      var cards = el('div', 'org__cards');
      group.roles.forEach(function (role) {
        var card = el('article', 'role' + (group.level === 1 ? ' role--lead' : ''));
        card.appendChild(el('p', 'role__title', role.role));

        var names = el('div', 'role__names');
        role.names.forEach(function (name) {
          if (name) {
            names.appendChild(el('p', 'role__name', name));
          } else {
            names.appendChild(el('p', 'role__name role__name--empty', 'Belum diisi'));
          }
        });
        card.appendChild(names);
        cards.appendChild(card);
      });
      level.appendChild(cards);
      wrap.appendChild(level);
    });
    host.appendChild(wrap);
  }

  function renderGallery(host, items, lightbox) {
    if (!items.length) {
      showEmpty(host, 'Belum ada foto di galeri', 'Dokumentasi kegiatan kelas akan segera diunggah.');
      return;
    }

    host.textContent = '';
    var grid = el('div', 'gallery');
    items.forEach(function (item) {
      var button = el('button', 'shot');
      button.type = 'button';

      var frame = el('div', 'shot__frame');
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = item.caption || item.file;
      img.addEventListener('error', function () {
        frame.textContent = 'Gambar tidak dapat dimuat';
        frame.style.padding = '0.75rem';
        frame.style.fontSize = '0.85rem';
      });
      img.src = 'assets/images/gallery/' + item.file;
      frame.appendChild(img);
      button.appendChild(frame);

      button.appendChild(el('p', 'shot__caption', item.caption || item.file));
      button.addEventListener('click', function () { openLightbox(lightbox, item); });
      grid.appendChild(button);
    });
    host.appendChild(grid);
  }

  function openLightbox(lightbox, item) {
    var img = lightbox.querySelector('#lightbox-img');
    var caption = lightbox.querySelector('#lightbox-caption');
    caption.textContent = item.caption || item.file;

    img.alt = item.caption || item.file;
    img.onerror = function () {
      img.removeAttribute('src');
      img.alt = 'Gambar tidak dapat dimuat.';
    };
    img.src = 'assets/images/gallery/' + item.file;

    if (typeof lightbox.showModal === 'function') {
      lightbox.showModal();
    } else {
      lightbox.setAttribute('open', 'open');
    }
  }

  function closeLightbox(lightbox) {
    if (typeof lightbox.close === 'function' && lightbox.open) lightbox.close();
    else lightbox.removeAttribute('open');
  }

  function renderToday(lessons) {
    var dateNode = document.getElementById('today-date');
    var listNode = document.getElementById('today-list');
    var noteNode = document.getElementById('today-note');
    if (!dateNode || !listNode) return;

    var now = new Date();
    dateNode.textContent = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(now);

    var info = todayInfo();
    var rows = [];

    function addRow(label, value) {
      var row = el('div', 'today__row');
      row.appendChild(el('dt', null, label));
      row.appendChild(el('dd', null, value));
      rows.push(row);
    }

    addRow('Status', info.status);

    if (lessons && info.key) {
      var dayName = findDayName(lessons, info.key);
      var taught = 0;
      if (dayName) {
        lessons.entries.forEach(function (entry) {
          if (!entry.marker && entry.mapel[dayName]) taught++;
        });
      }
      addRow('Sesi pelajaran', taught ? taught + ' sesi' : 'Belum ada');
    } else {
      addRow('Sesi pelajaran', 'Tidak ada jadwal hari ini');
    }

    listNode.textContent = '';
    rows.forEach(function (row) { listNode.appendChild(row); });

    if (!info.key && noteNode) {
      noteNode.hidden = false;
      noteNode.textContent = info.note;
    } else if (noteNode) {
      noteNode.hidden = true;
      noteNode.textContent = '';
    }
  }

  function renderTodayLessons(host, lessons) {
    var info = todayInfo();
    if (!info.key) {
      showEmpty(host, 'Tidak ada jadwal hari ini', info.note);
      return;
    }
    if (!lessons) {
      showError(host, 'Jadwal hari ini belum dapat dimuat.');
      return;
    }

    var dayName = findDayName(lessons, info.key);
    if (!dayName) {
      showEmpty(host, 'Informasi hari ini belum tersedia', 'Jadwal untuk hari ini belum tercatat.');
      return;
    }

    host.textContent = '';
    var list = el('div', 'readout');
    lessons.entries.forEach(function (entry) {
      if (entry.marker || entry.mapel[dayName]) list.appendChild(readoutRow(entry, dayName));
    });
    host.appendChild(list);
  }

  function renderTodayDuty(host, duty) {
    var info = todayInfo();
    if (!info.key) {
      showEmpty(host, 'Tidak ada piket hari ini', info.note);
      return;
    }
    if (!duty) {
      showError(host, 'Jadwal piket hari ini belum bisa dimuat.');
      return;
    }

    var dayName = findDayName(duty, info.key);
    if (!dayName) {
      showEmpty(host, 'Hari ini belum ada di data piket',
        'Kolom hari di assets/data/schedule_duty.csv belum memuat hari ini.');
      return;
    }

    var entries = duty.byDay[dayName] || [];
    if (!entries.length) {
      showEmpty(host, 'Belum ada petugas piket',
        'Nama petugas untuk ' + dayName + ' masih kosong di assets/data/schedule_duty.csv.');
      return;
    }

    host.textContent = '';
    var list = el('ul', 'duties');
    entries.forEach(function (entry) { list.appendChild(dutyRow(entry)); });
    host.appendChild(list);
    host.appendChild(el('p', 'day__total', entries.length + ' siswa bertugas hari ' + dayName));
  }

  function renderFooterLinks(host, links) {
    host.textContent = '';
    if (!links || !links.length) {
      var pending = el('li', 'foot__item foot__item--pending');
      pending.textContent = 'Belum ada tautan di assets/data/links.csv';
      host.appendChild(pending);
      return;
    }

    links.forEach(function (link) {
      var item = el('li', 'foot__item');
      if (link.url) {
        var anchor = el('a', 'foot__link', link.label);
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        item.appendChild(anchor);
      } else {
        item.appendChild(el('span', 'foot__link foot__link--empty', link.label));
        item.appendChild(el('span', 'foot__item-note', 'tautan belum diisi'));
      }
      host.appendChild(item);
    });
  }

  function renderUniform(host, lessons, uniforms) {
    host.textContent = '';
    var info = todayInfo();

    if (!info.key) {
      showEmpty(host, 'Tidak ada aturan seragam hari ini', info.note);
      return;
    }
    if (!uniforms) {
      showError(host, 'Aturan seragam belum dapat dimuat.');
      return;
    }

    var rule = uniforms.byDay[info.key];
    if (!rule) {
      showEmpty(host, 'Aturan seragam belum tersedia', 'Informasi seragam untuk hari ini belum diatur.');
      return;
    }

    var dayName = lessons ? findDayName(lessons, info.key) : null;
    var hasPe = dayHasSubject(lessons, dayName, /penjas|pjok/i);
    var usePe = hasPe && !!rule.peFile;
    var file = usePe ? rule.peFile : rule.file;

    var caption = el('figcaption', 'uniform__caption');
    caption.appendChild(el('span', 'uniform__day', 'Seragam hari ' + dayName));

    var frame = el('div', 'uniform__frame');
    var img = document.createElement('img');
    img.className = 'uniform__img';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = 'Seragam kelas untuk hari ' + dayName;
    img.addEventListener('error', function () {
      frame.classList.add('is-missing');
      frame.textContent = 'Gambar seragam belum tersedia.';
      if (img.parentNode === frame) frame.removeChild(img);
    });
    img.src = UNIFORM_DIR + file;
    frame.appendChild(img);

    host.appendChild(frame);
    host.appendChild(caption);

    if (usePe) {
      host.appendChild(el('p', 'uniform__note', 'Hari ini ada jadwal Penjaskes, silakan mengenakan pakaian olahraga.'));
    } else if (!lessons) {
      host.appendChild(el('p', 'uniform__note uniform__note--quiet', 'Jadwal hari ini belum termuat sepenuhnya.'));
    }
  }

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value).then(function () { return true; }, function () {
        return legacyCopy(value);
      });
    }
    return Promise.resolve(legacyCopy(value));
  }

  function legacyCopy(value) {
    var area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
    document.body.removeChild(area);
    return ok;
  }

  function wireStudents(students, roleByName, dutyNames) {
    var grid = document.getElementById('students-grid');
    var search = document.getElementById('cari-siswa');
    var count = document.getElementById('siswa-count');
    var copyButton = document.getElementById('salin-daftar');
    var toast = document.getElementById('toast');
    var query = '';

    function filtered() {
      if (!query) return students;
      return students.filter(function (student) {
        return normalizeName(student.name).indexOf(query) !== -1;
      });
    }

    function toastText(message) {
      toast.textContent = message;
      toast.hidden = false;
      window.clearTimeout(toast._timer);
      toast._timer = window.setTimeout(function () { toast.hidden = true; }, 5000);
    }

    function paint() {
      var list = filtered();
      count.textContent = query
        ? 'Menampilkan ' + list.length + ' dari ' + students.length + ' siswa dengan kata kunci "' + query + '".'
        : students.length + ' siswa terdaftar.';

      if (!list.length) {
        showEmpty(grid, 'Siswa tidak ditemukan',
          'Tidak ada nama yang sesuai dengan pencarian "' + query + '".',
          'Hapus Pencarian', function () {
            search.value = '';
            query = '';
            search.focus();
            paint();
          });
        return;
      }

      grid.textContent = '';
      var fragment = document.createDocumentFragment();
      list.forEach(function (student) {
        fragment.appendChild(studentCard(student, roleByName, dutyNames));
      });
      grid.appendChild(fragment);
    }

    search.addEventListener('input', function () {
      query = normalizeName(this.value);
      paint();
    });

    copyButton.addEventListener('click', function () {
      var list = filtered();
      if (!list.length) {
        toastText('Tidak ada nama untuk disalin.');
        return;
      }
      var text = list.map(function (student) {
        return student.no + '. ' + student.name;
      }).join('\n');
      copyText(text).then(function (ok) {
        toastText(ok
          ? 'Berhasil menyalin ' + list.length + ' nama ke papan klip.'
          : 'Gagal menyalin otomatis.');
      });
    });

    paint();
  }

  function wireNavigation() {
    var toggle = document.getElementById('nav-toggle');
    var panel = document.getElementById('nav-links');
    var bar = document.querySelector('.nav');
    if (!toggle || !panel || !bar) return;

    function setOpen(open) {
      panel.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Tutup' : 'Menu';
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    panel.addEventListener('click', function (event) {
      if (event.target.tagName === 'A') setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (!bar.contains(event.target)) setOpen(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 900) setOpen(false);
    });

    setOpen(false);
  }

  function wireScrollState() {
    var sections = ['beranda', 'siswa', 'jadwal', 'struktur', 'galeri']
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    if (!sections.length) return;

    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__list a'));
    var bar = document.querySelector('.nav');
    var ticking = false;

    function update() {
      var offset = (bar ? bar.offsetHeight : 58) + 28;
      var position = window.scrollY + offset;
      var current = sections[0];

      sections.forEach(function (section) {
        if (section.offsetTop <= position) current = section;
      });
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 2) {
        current = sections[sections.length - 1];
      }

      links.forEach(function (link) {
        if (link.getAttribute('href') === '#' + current.id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  function wireTabs() {
    var lists = document.querySelectorAll('[role="tablist"]');
    Array.prototype.forEach.call(lists, function (list) {
      var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
      if (tabs.length < 2) return;

      function select(tab, moveFocus) {
        tabs.forEach(function (item) {
          var active = item === tab;
          item.setAttribute('aria-selected', active ? 'true' : 'false');
          item.tabIndex = active ? 0 : -1;
          var panel = document.getElementById(item.getAttribute('aria-controls'));
          if (panel) panel.hidden = !active;
        });
        if (moveFocus) tab.focus();
      }

      tabs.forEach(function (tab, index) {
        tab.addEventListener('click', function () { select(tab, false); });
        tab.addEventListener('keydown', function (event) {
          var next = null;
          if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
          else if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
          else if (event.key === 'Home') next = tabs[0];
          else if (event.key === 'End') next = tabs[tabs.length - 1];
          if (!next) return;
          event.preventDefault();
          select(next, true);
        });
      });

      select(tabs[0], false);
    });
  }

  function wireBackToTop() {
    var button = document.getElementById('foot-top');
    if (!button) return;
    button.addEventListener('click', function () {
      // No behavior option on purpose: the CSS decides, so reduced-motion users get a jump.
      window.scrollTo({ top: 0 });
      var brand = document.querySelector('.brand');
      if (brand) brand.focus({ preventScroll: true });
    });
  }

  function wireLightbox() {
    var lightbox = document.getElementById('lightbox');
    var closeButton = document.getElementById('lightbox-close');
    if (!lightbox) return;

    if (closeButton) {
      closeButton.addEventListener('click', function () { closeLightbox(lightbox); });
    }
    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox) closeLightbox(lightbox);
    });
    lightbox.addEventListener('close', function () {
      var img = lightbox.querySelector('#lightbox-img');
      if (img) { img.onerror = null; img.removeAttribute('src'); }
    });
  }

  function boot() {
    wireNavigation();
    wireTabs();
    wireScrollState();
    wireLightbox();
    wireBackToTop();

    var lessonsHost = document.getElementById('lesson-days');
    var dutyHost = document.getElementById('duty-days');
    var orgHost = document.getElementById('org-tree');
    var galleryHost = document.getElementById('gallery-grid');
    var todayLessonsHost = document.getElementById('today-lessons');
    var todayDutyHost = document.getElementById('today-duty');
    var todayUniformHost = document.getElementById('today-uniform');
    var footLinksHost = document.getElementById('foot-links');
    var lightbox = document.getElementById('lightbox');

    var studentsPromise = loadCsv(FILES.students).then(parseStudents);
    var orgPromise = loadCsv(FILES.organization).then(parseOrganization);
    var lessonsPromise = loadCsv(FILES.lessons).then(parseLessons);
    var dutyPromise = loadCsv(FILES.duty).then(parseDuty);
    var galleryPromise = loadCsv(FILES.gallery).then(parseGallery);
    var uniformsPromise = loadCsv(FILES.uniforms).then(parseUniforms);
    var linksPromise = loadCsv(FILES.links).then(parseLinks);

    var students = null;
    var org = null;
    var lessons = null;
    var duty = null;
    var uniforms = null;
    var uniformsFailed = false;

    function renderTodayPanel() {
      renderToday(lessons);
      renderTodayLessons(todayLessonsHost, lessons);
      renderTodayDuty(todayDutyHost, duty);
      renderUniform(todayUniformHost, lessons, uniformsFailed ? null : uniforms);
    }

    function renderStudentGrid() {
      var grid = document.getElementById('students-grid');
      if (!students) {
        showError(grid, 'Daftar siswa belum dapat dimuat.');
        var counter = document.getElementById('siswa-count');
        if (counter) counter.textContent = 'Daftar siswa belum termuat, muat ulang halaman untuk mencoba lagi.';
        return;
      }
      if (!students.length) {
        showEmpty(grid, 'Daftar siswa masih kosong', 'Informasi anggota kelas akan segera diperbarui.');
        return;
      }
      wireStudents(students, org ? org.roleByName : {}, todayDutyNames(duty));
    }

    // Students, duties and the organization render together so the Piket tag on each
    // card and the role tag always agree with the data at the same moment.
    Promise.allSettled([studentsPromise, dutyPromise, orgPromise]).then(function (settled) {
      var studentsOk = settled[0].status === 'fulfilled';
      var dutyOk = settled[1].status === 'fulfilled';
      var orgOk = settled[2].status === 'fulfilled';

      students = studentsOk ? settled[0].value : null;
      duty = dutyOk ? settled[1].value : null;
      org = orgOk ? settled[2].value : null;

      if (dutyOk) renderDuty(dutyHost, duty);
      else showError(dutyHost, 'Jadwal piket belum dapat dimuat.');

      if (orgOk) renderOrganization(orgHost, org);
      else showError(orgHost, 'Struktur organisasi belum dapat dimuat.');

      renderStudentGrid();
      renderTodayDuty(todayDutyHost, duty);
    });

    lessonsPromise.then(function (result) {
      lessons = result;
      renderLessons(lessonsHost, result);
      renderTodayPanel();
    }).catch(function () {
      showError(lessonsHost, 'Jadwal pelajaran belum dapat dimuat.');
      renderTodayPanel();
    });

    uniformsPromise.then(function (result) {
      uniforms = result;
      renderUniform(todayUniformHost, lessons, uniforms);
    }).catch(function () {
      uniformsFailed = true;
      renderUniform(todayUniformHost, lessons, null);
    });

    linksPromise.then(function (links) {
      renderFooterLinks(footLinksHost, links);
    }).catch(function () {
      renderFooterLinks(footLinksHost, null);
    });

    galleryPromise.then(function (items) {
      renderGallery(galleryHost, items, lightbox);
    }).catch(function () {
      showError(galleryHost, 'Daftar galeri belum dapat dimuat.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
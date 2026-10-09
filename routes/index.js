const express = require('express');
const router = express.Router();
const db = require('../db');

// GET / - Dashboard Overview
router.get('/', async (req, res) => {
  try {
    const lgaCountRes = await db.get('SELECT COUNT(*) as count FROM lga WHERE state_id = 25');
    const puCountRes = await db.get('SELECT COUNT(*) as count FROM polling_unit');
    const wardCountRes = await db.get('SELECT COUNT(*) as count FROM ward');
    const partyCountRes = await db.get('SELECT COUNT(*) as count FROM party');
    const reportingPUsRes = await db.get(
      'SELECT COUNT(DISTINCT polling_unit_uniqueid) as count FROM announced_pu_results'
    );

    // Statewide Party Leaderboard
    const partyStandings = await db.query(
      `SELECT party_abbreviation, SUM(party_score) as total_votes
       FROM announced_pu_results
       GROUP BY party_abbreviation
       ORDER BY total_votes DESC`
    );

    const totalStatewideVotes = partyStandings.reduce((acc, p) => acc + (p.total_votes || 0), 0);

    // All 25 LGAs with stats for the interactive directory
    const lgaSummaries = await db.query(
      `SELECT 
        l.lga_id, 
        l.lga_name,
        (SELECT COUNT(*) FROM polling_unit pu WHERE pu.lga_id = l.lga_id) as total_pus,
        (SELECT COUNT(DISTINCT r.polling_unit_uniqueid) 
         FROM announced_pu_results r 
         JOIN polling_unit pu ON CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid 
         WHERE pu.lga_id = l.lga_id) as reporting_pus,
        (SELECT COALESCE(SUM(r.party_score), 0)
         FROM announced_pu_results r 
         JOIN polling_unit pu ON CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid 
         WHERE pu.lga_id = l.lga_id) as total_votes
      FROM lga l
      WHERE l.state_id = 25
      ORDER BY total_votes DESC, l.lga_name ASC`
    );

    // Recent polling units with results
    const recentUnits = await db.query(
      `SELECT DISTINCT 
        pu.uniqueid,
        pu.polling_unit_name,
        pu.polling_unit_number,
        l.lga_name,
        (SELECT SUM(party_score) FROM announced_pu_results r WHERE CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid) as total_votes
      FROM announced_pu_results r
      JOIN polling_unit pu ON CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid
      LEFT JOIN lga l ON pu.lga_id = l.lga_id
      ORDER BY pu.uniqueid DESC
      LIMIT 6`
    );

    res.render('pages/home', {
      title: 'Delta State Election Collation & Results Portal',
      currentPage: 'home',
      stats: {
        lgas: lgaCountRes ? lgaCountRes.count : 25,
        pollingUnits: puCountRes ? puCountRes.count : 0,
        wards: wardCountRes ? wardCountRes.count : 0,
        parties: partyCountRes ? partyCountRes.count : 0,
        reportingPUs: reportingPUsRes ? reportingPUsRes.count : 0,
        totalVotes: totalStatewideVotes
      },
      partyStandings,
      totalStatewideVotes,
      lgaSummaries,
      recentUnits
    });
  } catch (err) {
    console.error('Error on home page:', err);
    res.status(500).render('error', { error: err.message });
  }
});

// GET /polling-unit - Polling Unit Details and Party Results
router.get('/polling-unit', async (req, res) => {
  try {
    const lgas = await db.query(
      'SELECT uniqueid, lga_id, lga_name FROM lga WHERE state_id = 25 ORDER BY lga_name ASC'
    );

    const initialPuId = req.query.id ? parseInt(req.query.id, 10) : 8; // Default initial view: PU 8
    let selectedPU = null;
    let puResults = [];
    let totalVotes = 0;

    if (initialPuId) {
      selectedPU = await db.get(
        `SELECT 
          pu.*, 
          l.lga_name,
          w.ward_name
        FROM polling_unit pu
        LEFT JOIN lga l ON pu.lga_id = l.lga_id
        LEFT JOIN ward w ON pu.ward_id = w.ward_id AND pu.lga_id = w.lga_id
        WHERE pu.uniqueid = ?`,
        [initialPuId]
      );

      if (selectedPU) {
        puResults = await db.query(
          `SELECT 
            result_id,
            party_abbreviation,
            party_score,
            entered_by_user,
            date_entered
          FROM announced_pu_results 
          WHERE polling_unit_uniqueid = ? OR CAST(polling_unit_uniqueid AS INTEGER) = ?
          ORDER BY party_score DESC`,
          [initialPuId.toString(), initialPuId]
        );

        totalVotes = puResults.reduce((acc, r) => acc + (r.party_score || 0), 0);
      }
    }

    // List of PUs that already have announced results for quick jumping
    const pusWithResults = await db.query(
      `SELECT DISTINCT 
        pu.uniqueid,
        pu.polling_unit_name,
        pu.polling_unit_number,
        l.lga_name
      FROM announced_pu_results r
      JOIN polling_unit pu ON CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid
      LEFT JOIN lga l ON pu.lga_id = l.lga_id
      ORDER BY pu.uniqueid ASC`
    );

    res.render('pages/polling-unit', {
      title: 'Polling Unit Results - Delta State Election Portal',
      currentPage: 'polling-unit',
      lgas,
      selectedPU,
      puResults,
      totalVotes,
      pusWithResults,
      currentPuId: initialPuId
    });
  } catch (err) {
    console.error('Error on polling-unit page:', err);
    res.status(500).render('error', { error: err.message });
  }
});

// GET /lga-total - LGA Summary Collation Page
router.get('/lga-total', async (req, res) => {
  try {
    const lgas = await db.query(
      'SELECT uniqueid, lga_id, lga_name FROM lga WHERE state_id = 25 ORDER BY lga_name ASC'
    );

    const selectedLgaId = req.query.lga_id ? parseInt(req.query.lga_id, 10) : (lgas[0] ? lgas[0].lga_id : 1);
    let selectedLga = null;
    let summedResults = [];
    let announcedResults = [];
    let comparison = [];
    let totalPuVotes = 0;
    let totalAnnouncedVotes = 0;
    let totalPUs = 0;
    let reportingPUs = 0;

    if (selectedLgaId) {
      selectedLga = await db.get('SELECT * FROM lga WHERE lga_id = ?', [selectedLgaId]);

      // Grassroots Aggregation: Summed total of all reporting polling units under selected LGA
      summedResults = await db.query(
        `SELECT 
          r.party_abbreviation,
          SUM(r.party_score) AS total_score,
          COUNT(DISTINCT pu.uniqueid) as reporting_pus
        FROM announced_pu_results r
        JOIN polling_unit pu ON CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid
        WHERE pu.lga_id = ?
        GROUP BY r.party_abbreviation
        ORDER BY total_score DESC`,
        [selectedLgaId]
      );

      totalPuVotes = summedResults.reduce((acc, r) => acc + (r.total_score || 0), 0);

      const puCount = await db.get('SELECT COUNT(*) as count FROM polling_unit WHERE lga_id = ?', [selectedLgaId]);
      totalPUs = puCount ? puCount.count : 0;

      const reportingCount = await db.get(
        `SELECT COUNT(DISTINCT pu.uniqueid) as count
         FROM polling_unit pu
         JOIN announced_pu_results r ON CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid
         WHERE pu.lga_id = ?`,
        [selectedLgaId]
      );
      reportingPUs = reportingCount ? reportingCount.count : 0;

      // Comparison table with announced_lga_results
      announcedResults = await db.query(
        'SELECT party_abbreviation, party_score FROM announced_lga_results WHERE lga_name = ? ORDER BY party_score DESC',
        [selectedLgaId.toString()]
      );

      totalAnnouncedVotes = announcedResults.reduce((acc, r) => acc + (r.party_score || 0), 0);

      function normParty(p) {
        const str = (p || '').toUpperCase().trim();
        if (str === 'LABO' || str === 'LABOUR') return 'LABOUR';
        return str;
      }

      const announcedMap = {};
      announcedResults.forEach(r => {
        announcedMap[normParty(r.party_abbreviation)] = r.party_score;
      });

      const allParties = await db.query('SELECT partyname, partyid FROM party ORDER BY partyname ASC');
      comparison = allParties.map(p => {
        const code = normParty(p.partyid);
        const puItem = summedResults.find(r => normParty(r.party_abbreviation) === code);
        const puScore = puItem ? puItem.total_score : 0;
        const announcedScore = announcedMap[code] !== undefined ? announcedMap[code] : 0;
        const difference = puScore - announcedScore;

        return {
          party: p.partyid,
          partyName: p.partyname,
          puScore,
          announcedScore,
          difference
        };
      });
    }

    res.render('pages/lga-total', {
      title: 'Local Government Summary - Delta State Election Portal',
      currentPage: 'lga-total',
      lgas,
      selectedLgaId,
      selectedLga,
      summedResults,
      announcedResults,
      comparison,
      totalPuVotes,
      totalAnnouncedVotes,
      totalPUs,
      reportingPUs
    });
  } catch (err) {
    console.error('Error on lga-total page:', err);
    res.status(500).render('error', { error: err.message });
  }
});

// GET /new-polling-unit - Register Polling Unit & Enter Scores Page
router.get('/new-polling-unit', async (req, res) => {
  try {
    const lgas = await db.query(
      'SELECT uniqueid, lga_id, lga_name FROM lga WHERE state_id = 25 ORDER BY lga_name ASC'
    );
    const parties = await db.query('SELECT * FROM party ORDER BY partyname ASC');

    const successMessage = req.query.success || null;
    const createdPuId = req.query.new_id || null;

    res.render('pages/new-polling-unit', {
      title: 'Submit Polling Unit Returns - Delta State Election Portal',
      currentPage: 'new-polling-unit',
      lgas,
      parties,
      successMessage,
      createdPuId
    });
  } catch (err) {
    console.error('Error on new-polling-unit page:', err);
    res.status(500).render('error', { error: err.message });
  }
});

// POST /new-polling-unit - Persist New Polling Unit and Party Scores
router.post('/new-polling-unit', async (req, res) => {
  try {
    const {
      lga_id,
      ward_id,
      polling_unit_name,
      polling_unit_number,
      polling_unit_description,
      lat,
      long,
      entered_by_user
    } = req.body;

    // Basic Validation
    if (!lga_id || !ward_id || !polling_unit_name) {
      return res.status(400).render('error', {
        error: 'Please fill in all required fields: LGA, Ward, and Polling Unit Name.'
      });
    }

    const parsedLgaId = parseInt(lga_id, 10);
    const parsedWardId = parseInt(ward_id, 10);
    const userName = (entered_by_user || 'Assessor Admin').trim();
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Get next polling_unit_id for this ward
    const maxPuIdRes = await db.get(
      'SELECT MAX(polling_unit_id) as max_id FROM polling_unit WHERE ward_id = ? AND lga_id = ?',
      [parsedWardId, parsedLgaId]
    );
    const nextPuId = (maxPuIdRes && maxPuIdRes.max_id) ? maxPuIdRes.max_id + 1 : 1;

    // 1. Insert into polling_unit
    const puInsertRes = await db.run(
      `INSERT INTO polling_unit (
        polling_unit_id,
        ward_id,
        lga_id,
        polling_unit_number,
        polling_unit_name,
        polling_unit_description,
        lat,
        long,
        entered_by_user,
        date_entered,
        user_ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextPuId,
        parsedWardId,
        parsedLgaId,
        polling_unit_number || `DT${parsedLgaId}${parsedWardId}00${nextPuId}`,
        polling_unit_name,
        polling_unit_description || polling_unit_name,
        lat || null,
        long || null,
        userName,
        nowStr,
        userIp
      ]
    );

    const newPuUniqueId = puInsertRes.lastInsertRowid;

    // 2. Insert party results
    // Parties from party table
    const parties = await db.query('SELECT partyid FROM party');
    let insertedScoresCount = 0;

    for (const p of parties) {
      const partyKey = `score_${p.partyid}`;
      const rawScore = req.body[partyKey];
      const score = rawScore !== undefined && rawScore !== '' ? parseInt(rawScore, 10) : 0;

      await db.run(
        `INSERT INTO announced_pu_results (
          polling_unit_uniqueid,
          party_abbreviation,
          party_score,
          entered_by_user,
          date_entered,
          user_ip_address
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newPuUniqueId.toString(),
          p.partyid,
          score,
          userName,
          nowStr,
          userIp
        ]
      );
      insertedScoresCount++;
    }

    res.redirect(`/new-polling-unit?success=1&new_id=${newPuUniqueId}`);
  } catch (err) {
    console.error('Error inserting new polling unit and results:', err);
    res.status(500).render('error', { error: `Database insert failed: ${err.message}` });
  }
});

module.exports = router;

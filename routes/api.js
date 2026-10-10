const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/lgas - Get all LGAs in Delta State (state_id = 25)
router.get('/lgas', async (req, res) => {
  try {
    const lgas = await db.query(
      'SELECT uniqueid, lga_id, lga_name FROM lga WHERE state_id = 25 ORDER BY lga_name ASC'
    );
    res.json({ success: true, data: lgas });
  } catch (err) {
    console.error('Error fetching LGAs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wards?lga_id=:lga_id - Get wards for a specific LGA
router.get('/wards', async (req, res) => {
  try {
    const lgaId = req.query.lga_id;
    if (!lgaId) {
      return res.status(400).json({ success: false, error: 'lga_id query parameter is required' });
    }

    const wards = await db.query(
      'SELECT uniqueid, ward_id, ward_name, lga_id FROM ward WHERE lga_id = ? ORDER BY ward_name ASC',
      [parseInt(lgaId, 10)]
    );
    res.json({ success: true, data: wards });
  } catch (err) {
    console.error('Error fetching wards:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/polling-units - Get polling units filtered by ward and/or LGA
router.get('/polling-units', async (req, res) => {
  try {
    const { ward_id, lga_id, has_results } = req.query;
    let sql = `
      SELECT 
        pu.uniqueid, 
        pu.polling_unit_id, 
        pu.ward_id, 
        pu.lga_id, 
        pu.polling_unit_number, 
        pu.polling_unit_name,
        w.ward_name,
        l.lga_name,
        (SELECT COUNT(*) FROM announced_pu_results r WHERE CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid) as results_count
      FROM polling_unit pu
      LEFT JOIN lga l ON pu.lga_id = l.lga_id
      LEFT JOIN ward w ON pu.ward_id = w.ward_id AND pu.lga_id = w.lga_id
      WHERE 1=1
    `;
    const params = [];

    if (lga_id) {
      sql += ' AND pu.lga_id = ?';
      params.push(parseInt(lga_id, 10));
    }

    if (ward_id) {
      sql += ' AND pu.ward_id = ?';
      params.push(parseInt(ward_id, 10));
    }

    if (has_results === 'true' || has_results === '1') {
      sql += ' AND (SELECT COUNT(*) FROM announced_pu_results r WHERE CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid) > 0';
    }

    sql += ' ORDER BY pu.polling_unit_name ASC';

    const pollingUnits = await db.query(sql, params);
    res.json({ success: true, data: pollingUnits });
  } catch (err) {
    console.error('Error fetching polling units:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/polling-unit/:id - Get polling unit info and results
router.get('/polling-unit/:id', async (req, res) => {
  try {
    const puid = parseInt(req.params.id, 10);
    const pu = await db.get(
      `SELECT 
        pu.*, 
        l.lga_name,
        w.ward_name
      FROM polling_unit pu
      LEFT JOIN lga l ON pu.lga_id = l.lga_id
      LEFT JOIN ward w ON pu.ward_id = w.ward_id AND pu.lga_id = w.lga_id
      WHERE pu.uniqueid = ?`,
      [puid]
    );

    if (!pu) {
      return res.status(404).json({ success: false, error: 'Polling unit not found' });
    }

    const results = await db.query(
      `SELECT 
        result_id,
        party_abbreviation,
        party_score,
        entered_by_user,
        date_entered,
        user_ip_address
      FROM announced_pu_results 
      WHERE polling_unit_uniqueid = ? OR CAST(polling_unit_uniqueid AS INTEGER) = ?
      ORDER BY party_score DESC`,
      [puid.toString(), puid]
    );

    const totalVotes = results.reduce((acc, r) => acc + (r.party_score || 0), 0);

    res.json({
      success: true,
      data: {
        pollingUnit: pu,
        results,
        totalVotes
      }
    });
  } catch (err) {
    console.error('Error fetching polling unit details:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/lga/:lga_id/summed-results - Calculate aggregated LGA totals and reconciliation
router.get('/lga/:lga_id/summed-results', async (req, res) => {
  try {
    const lgaId = parseInt(req.params.lga_id, 10);

    // Fetch LGA details
    const lga = await db.get('SELECT * FROM lga WHERE lga_id = ?', [lgaId]);
    if (!lga) {
      return res.status(404).json({ success: false, error: 'LGA not found' });
    }

    // 1. Calculate summed total results of all polling units under this LGA
    // (Explicitly joining polling_unit and announced_pu_results)
    const summedResults = await db.query(
      `SELECT 
        r.party_abbreviation,
        SUM(r.party_score) AS total_score,
        COUNT(DISTINCT pu.uniqueid) as reporting_pus
      FROM announced_pu_results r
      JOIN polling_unit pu ON CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid
      WHERE pu.lga_id = ?
      GROUP BY r.party_abbreviation
      ORDER BY total_score DESC`,
      [lgaId]
    );

    // Total PU votes in this LGA
    const totalPuVotes = summedResults.reduce((acc, r) => acc + (r.total_score || 0), 0);

    // Total polling units count in this LGA
    const puCountRes = await db.get(
      'SELECT COUNT(*) as total_pus FROM polling_unit WHERE lga_id = ?',
      [lgaId]
    );

    // Reporting polling units in this LGA
    const reportingPUsRes = await db.get(
      `SELECT COUNT(DISTINCT pu.uniqueid) as reporting_pus
       FROM polling_unit pu
       JOIN announced_pu_results r ON CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid
       WHERE pu.lga_id = ?`,
      [lgaId]
    );

    // 2. Fetch announced LGA results for collation reconciliation audit
    const announcedResults = await db.query(
      `SELECT 
        party_abbreviation,
        party_score
      FROM announced_lga_results 
      WHERE lga_name = ?
      ORDER BY party_score DESC`,
      [lgaId.toString()]
    );

    const totalAnnouncedVotes = announcedResults.reduce((acc, r) => acc + (r.party_score || 0), 0);

    function normParty(p) {
      const str = (p || '').toUpperCase().trim();
      if (str === 'LABO' || str === 'LABOUR') return 'LABOUR';
      return str;
    }

    // Build comparison lookup
    const announcedMap = {};
    announcedResults.forEach(r => {
      announcedMap[normParty(r.party_abbreviation)] = r.party_score;
    });

    const allParties = await db.query('SELECT partyname, partyid FROM party ORDER BY partyname ASC');
    
    // Combine into comparison data
    const comparison = allParties.map(p => {
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
        difference,
        status: difference === 0 ? 'Match' : (difference > 0 ? 'PU Higher' : 'Announced Higher')
      };
    });

    res.json({
      success: true,
      data: {
        lga,
        totalPUs: puCountRes ? puCountRes.total_pus : 0,
        reportingPUs: reportingPUsRes ? reportingPUsRes.reporting_pus : 0,
        totalPuVotes,
        totalAnnouncedVotes,
        summedResults,
        announcedResults,
        comparison
      }
    });
  } catch (err) {
    console.error('Error calculating LGA summed total:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/parties - Get all registered political parties
router.get('/parties', async (req, res) => {
  try {
    const parties = await db.query('SELECT * FROM party ORDER BY partyname ASC');
    res.json({ success: true, data: parties });
  } catch (err) {
    console.error('Error fetching parties:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/search-polling-units - Fast instant autocomplete search across all polling units
router.get('/search-polling-units', async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q || q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const term = `%${q}%`;
    const results = await db.query(
      `SELECT 
        pu.uniqueid,
        pu.polling_unit_name,
        pu.polling_unit_number,
        pu.polling_unit_description,
        l.lga_name,
        w.ward_name,
        (SELECT COUNT(*) FROM announced_pu_results r WHERE CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid) as has_results
      FROM polling_unit pu
      LEFT JOIN lga l ON pu.lga_id = l.lga_id
      LEFT JOIN ward w ON pu.ward_id = w.ward_id
      WHERE pu.polling_unit_name LIKE ? 
         OR pu.polling_unit_number LIKE ? 
         OR pu.polling_unit_description LIKE ?
         OR l.lga_name LIKE ?
         OR CAST(pu.uniqueid AS TEXT) = ?
      ORDER BY has_results DESC, pu.polling_unit_name ASC
      LIMIT 12`,
      [term, term, term, term, q]
    );

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error searching polling units:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

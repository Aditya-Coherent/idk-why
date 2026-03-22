import { NextResponse } from "next/server"
import { query } from "@/lib/db"

/** Hardcoded list of locally available PDF keywords (Vercel can't use readdirSync on public/) */
const LOCAL_PDF_KEYWORDS = [
  "3D Cell Culture Market",
  "3D Printed Medical Devices Market",
  "4-tert-Amylphenol Market",
  "5G Chipset Market",
  "A2P _Application to Person_ SMS Market",
  "ACE Equipment Coatings Market",
  "AFP-ATL Machines Market",
  "AIOps Platform Market",
  "APAC Generic Oncology Sterile Injectable Market",
  "ASEAN Automotive Aftermarket",
]

function getLocalPdfKeywords(): string[] {
  return LOCAL_PDF_KEYWORDS
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const catId = searchParams.get("catId")
  const limit = Math.min(Number(searchParams.get("limit") || 12), 50)

  try {
    const pdfKeywords = getLocalPdfKeywords()

    let trendingRows: unknown[] = []

    if (pdfKeywords.length > 0) {
      // Only show reports that have local PDFs available
      const placeholders = pdfKeywords.map((_, i) => `$${i + 1}`).join(",")
      let sql = `SELECT newsid, keyword, catid, forcastyear, createddate, reportstatus
        FROM cmi_reports
        WHERE isactive = 1 AND reportstatus = 1 AND keyword IN (${placeholders})`
      const params: unknown[] = [...pdfKeywords]

      if (catId) {
        sql += ` AND catid = $${pdfKeywords.length + 1}`
        params.push(Number(catId))
      }

      sql += ` ORDER BY RANDOM() LIMIT ${limit}`

      const trendingRes = await query(sql, params)
      trendingRows = trendingRes.rows
    }

    // Upcoming = reportstatus 0
    let upcomingSql = `SELECT newsid, keyword, catid, forcastyear, createddate, reportstatus
      FROM cmi_reports WHERE isactive = 1 AND reportstatus = 0`
    const upcomingParams: unknown[] = []
    if (catId) {
      upcomingSql += ` AND catid = $1`
      upcomingParams.push(Number(catId))
    }
    upcomingSql += ` ORDER BY createddate DESC LIMIT ${limit}`

    const upcomingRes = await query(upcomingSql, upcomingParams)

    // To Be Published = upcoming reports with different random selection (10 reports)
    let toBePublishedSql = `SELECT newsid, keyword, catid, forcastyear, createddate, reportstatus
      FROM cmi_reports WHERE isactive = 1 AND reportstatus = 0`
    const toBePublishedParams: unknown[] = []
    if (catId) {
      toBePublishedSql += ` AND catid = $1`
      toBePublishedParams.push(Number(catId))
    }
    toBePublishedSql += ` ORDER BY RANDOM() LIMIT 10`

    const toBePublishedRes = await query(toBePublishedSql, toBePublishedParams)

    return NextResponse.json({
      trending: trendingRows,
      upcoming: upcomingRes.rows,
      toBePublished: toBePublishedRes.rows,
    })
  } catch (error) {
    console.error("Category reports error:", error)
    return NextResponse.json({ trending: [], upcoming: [], toBePublished: [] })
  }
}

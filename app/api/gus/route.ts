import { NextRequest, NextResponse } from 'next/server'

const GUS_API_URL = process.env.BIR_API_URL!
const GUS_API_KEY = process.env.BIR_API_KEY!

interface GUSCompanyData {
  name: string
  street: string
  buildingNumber: string
  apartmentNumber?: string
  city: string
  zip: string
  nip: string
  regon: string
  krs?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏢 GUS API Request started')
    
    if (!GUS_API_URL || !GUS_API_KEY) {
      console.error('❌ Missing GUS environment variables')
      return NextResponse.json({ 
        error: 'Konfiguracja serwera - brak zmiennych środowiskowych' 
      }, { status: 500 })
    }

    const { nip } = await request.json()

    if (!nip) {
      return NextResponse.json({ error: 'NIP jest wymagany' }, { status: 400 })
    }

    console.log('🔍 Searching for NIP:', nip)

    // Step 1: Login to GUS API
    const sessionId = await loginToGUS()
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Błąd logowania do GUS' }, { status: 500 })
    }

    console.log('✅ Login successful, session ID obtained')

    // Step 2: Search for company by NIP
    const companyData = await searchCompanyByNIP(sessionId, nip)
    
    if (!companyData) {
      return NextResponse.json({ error: 'Nie znaleziono firmy o podanym NIP' }, { status: 404 })
    }

    console.log('🎯 Company data found successfully')

    return NextResponse.json({ success: true, data: companyData })

  } catch (error) {
    console.error('💥 GUS API Error:', error)
    return NextResponse.json({ error: 'Błąd podczas pobierania danych z GUS' }, { status: 500 })
  }
}

async function loginToGUS(): Promise<string | null> {
  console.log('🔐 Attempting to login to GUS API...')
  
  const soapEnvelope = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07">
      <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
        <wsa:To>${GUS_API_URL}</wsa:To>
        <wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj</wsa:Action>
      </soap:Header>
      <soap:Body>
        <ns:Zaloguj>
          <ns:pKluczUzytkownika>${GUS_API_KEY}</ns:pKluczUzytkownika>
        </ns:Zaloguj>
      </soap:Body>
    </soap:Envelope>
  `

  try {
    const response = await fetch(GUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'SOAPAction': 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj',
        'User-Agent': 'Mozilla/5.0 (compatible; GUS-API-Client/1.0)'
      },
      body: soapEnvelope,
      signal: AbortSignal.timeout(30000) // 30 seconds timeout
    })

    if (!response.ok) {
      console.error('❌ GUS Login response not OK:', response.status)
      return null
    }

    const responseText = await response.text()
    
    // Check for SOAP faults
    if (responseText.includes('soap:Fault') || responseText.includes('faultstring')) {
      console.error('❌ SOAP fault detected in login response')
      return null
    }
    
    // Extract session ID
    const sessionIdMatch = responseText.match(/<ZalogujResult>(.*?)<\/ZalogujResult>/)
    
    if (sessionIdMatch && sessionIdMatch[1] && sessionIdMatch[1].length > 0) {
      console.log('✅ Session ID extracted successfully')
      return sessionIdMatch[1]
    }
    
    console.error('❌ Could not extract session ID from response')
    return null
  } catch (error) {
    console.error('❌ Login to GUS failed:', error)
    return null
  }
}

async function searchCompanyByNIP(sessionId: string, nip: string): Promise<GUSCompanyData | null> {
  console.log('🔍 Searching for company with NIP:', nip)
  
  const cleanNip = nip.replace(/[^0-9]/g, '')
  
  const soapEnvelope = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07" xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract">
      <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
        <wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty</wsa:Action>
        <wsa:To>${GUS_API_URL}</wsa:To>
      </soap:Header>
      <soap:Body>
        <ns:DaneSzukajPodmioty>
          <ns:pParametryWyszukiwania>
            <dat:Nip>${cleanNip}</dat:Nip>
          </ns:pParametryWyszukiwania>
        </ns:DaneSzukajPodmioty>
      </soap:Body>
    </soap:Envelope>
  `
  
  try {
    const response = await fetch(GUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'SOAPAction': 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty',
        'sid': sessionId,
        'User-Agent': 'Mozilla/5.0 (compatible; GUS-API-Client/1.0)'
      },
      body: soapEnvelope,
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      console.error('❌ GUS Search response not OK:', response.status)
      return null
    }

    const responseText = await response.text()
    
    // Check for errors
    if (responseText.includes('ErrorCode') || responseText.includes('soap:Fault')) {
      console.error('❌ GUS API returned an error')
      return null
    }
    
    // Parse XML response
    const companyData = parseCompanyDataFromXML(responseText)
    return companyData
  } catch (error) {
    console.error('❌ Search company by NIP failed:', error)
    return null
  }
}

function parseCompanyDataFromXML(xmlResponse: string): GUSCompanyData | null {
  try {
    console.log('📝 Parsing XML response for company data')
    
    // Extract result data
    const resultMatch = xmlResponse.match(/<DaneSzukajPodmiotyResult>([\s\S]*?)<\/DaneSzukajPodmiotyResult>/)
    
    if (!resultMatch || !resultMatch[1]) {
      console.error('❌ No result data found in response')
      return null
    }
    
    // Decode HTML entities
    const decodedData = resultMatch[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#xD;/g, '\r')
      .replace(/&#xA;/g, '\n')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
    
    // Extract company data
    const nameMatch = decodedData.match(/<Nazwa>(.*?)<\/Nazwa>/)
    const streetMatch = decodedData.match(/<Ulica>(.*?)<\/Ulica>/)
    const buildingMatch = decodedData.match(/<NrNieruchomosci>(.*?)<\/NrNieruchomosci>/)
    const apartmentMatch = decodedData.match(/<NrLokalu>(.*?)<\/NrLokalu>/)
    const cityMatch = decodedData.match(/<Miejscowosc>(.*?)<\/Miejscowosc>/)
    const zipMatch = decodedData.match(/<KodPocztowy>(.*?)<\/KodPocztowy>/)
    const nipMatch = decodedData.match(/<Nip>(.*?)<\/Nip>/)
    const regonMatch = decodedData.match(/<Regon>(.*?)<\/Regon>/)

    if (nameMatch && nameMatch[1]) {
      const companyData = {
        name: nameMatch[1] || '',
        street: streetMatch?.[1] || '',
        buildingNumber: buildingMatch?.[1] || '',
        apartmentNumber: apartmentMatch?.[1] || undefined,
        city: cityMatch?.[1] || '',
        zip: zipMatch?.[1] || '',
        nip: nipMatch?.[1] || '',
        regon: regonMatch?.[1] || '',
        krs: undefined
      }
      
      console.log('✅ Parsed company data successfully')
      return companyData
    }

    console.error('❌ Could not find company name in response')
    return null
  } catch (error) {
    console.error('❌ Failed to parse company data:', error)
    return null
  }
}

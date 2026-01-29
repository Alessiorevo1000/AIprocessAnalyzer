import si from 'systeminformation';

/**
 * Network Analyzer - Analizza connessioni di rete e porte aperte
 */
export class NetworkAnalyzer {
  constructor() {
    this.connections = [];
    this.openPorts = [];
    this.networkInterfaces = [];
  }

  /**
   * Esegue analisi completa della rete
   * @returns {object} Informazioni di rete
   */
  async analyze() {
    try {
      const [connections, interfaces, stats, defaultGateway] = await Promise.all([
        this.getConnections(),
        this.getInterfaces(),
        this.getNetworkStats(),
        this.getDefaultGateway()
      ]);

      return {
        connections: this.analyzeConnections(connections),
        interfaces,
        stats,
        defaultGateway,
        summary: this.generateSummary(connections, interfaces),
        securityAnalysis: this.analyzeSecurityRisks(connections)
      };
    } catch (error) {
      console.warn(`⚠️  Errore analisi rete: ${error.message}`);
      return {
        connections: [],
        interfaces: [],
        stats: {},
        defaultGateway: null,
        summary: { error: error.message },
        securityAnalysis: { error: error.message }
      };
    }
  }

  /**
   * Ottieni connessioni attive
   */
  async getConnections() {
    try {
      const connections = await si.networkConnections();
      return connections.map(conn => ({
        protocol: conn.protocol,
        localAddress: conn.localAddress,
        localPort: conn.localPort,
        peerAddress: conn.peerAddress,
        peerPort: conn.peerPort,
        state: conn.state,
        process: conn.process || 'unknown',
        pid: conn.pid
      }));
    } catch {
      return [];
    }
  }

  /**
   * Ottieni interfacce di rete
   */
  async getInterfaces() {
    try {
      const interfaces = await si.networkInterfaces();
      return interfaces.map(iface => ({
        name: iface.iface,
        ip4: iface.ip4,
        ip6: iface.ip6,
        mac: iface.mac,
        type: iface.type,
        speed: iface.speed,
        operstate: iface.operstate,
        dhcp: iface.dhcp
      }));
    } catch {
      return [];
    }
  }

  /**
   * Ottieni statistiche di rete
   */
  async getNetworkStats() {
    try {
      const stats = await si.networkStats();
      return stats.map(stat => ({
        interface: stat.iface,
        rxBytes: stat.rx_bytes,
        txBytes: stat.tx_bytes,
        rxSec: stat.rx_sec,
        txSec: stat.tx_sec,
        rxDropped: stat.rx_dropped,
        txDropped: stat.tx_dropped,
        rxErrors: stat.rx_errors,
        txErrors: stat.tx_errors
      }));
    } catch {
      return [];
    }
  }

  /**
   * Ottieni gateway predefinito
   */
  async getDefaultGateway() {
    try {
      const gateway = await si.networkGatewayDefault();
      return gateway;
    } catch {
      return null;
    }
  }

  /**
   * Analizza connessioni per identificare pattern
   */
  analyzeConnections(connections) {
    const analysis = {
      total: connections.length,
      byState: {},
      byProtocol: {},
      listeningPorts: [],
      establishedConnections: [],
      externalConnections: []
    };

    connections.forEach(conn => {
      // Per stato
      analysis.byState[conn.state] = (analysis.byState[conn.state] || 0) + 1;
      
      // Per protocollo
      analysis.byProtocol[conn.protocol] = (analysis.byProtocol[conn.protocol] || 0) + 1;
      
      // Porte in ascolto
      if (conn.state === 'LISTEN' || conn.state === 'LISTENING') {
        analysis.listeningPorts.push({
          port: conn.localPort,
          address: conn.localAddress,
          process: conn.process,
          pid: conn.pid,
          service: this.identifyService(conn.localPort)
        });
      }
      
      // Connessioni stabilite
      if (conn.state === 'ESTABLISHED') {
        analysis.establishedConnections.push(conn);
        
        // Connessioni esterne (non localhost)
        if (!this.isLocalAddress(conn.peerAddress)) {
          analysis.externalConnections.push({
            ...conn,
            geoHint: this.getGeoHint(conn.peerAddress)
          });
        }
      }
    });

    return analysis;
  }

  /**
   * Identifica servizio comune per porta
   */
  identifyService(port) {
    const knownPorts = {
      20: 'FTP Data',
      21: 'FTP',
      22: 'SSH',
      23: 'Telnet',
      25: 'SMTP',
      53: 'DNS',
      80: 'HTTP',
      110: 'POP3',
      143: 'IMAP',
      443: 'HTTPS',
      445: 'SMB',
      993: 'IMAPS',
      995: 'POP3S',
      1433: 'SQL Server',
      1521: 'Oracle',
      3000: 'Dev Server',
      3306: 'MySQL',
      3389: 'RDP',
      5432: 'PostgreSQL',
      5900: 'VNC',
      6379: 'Redis',
      8080: 'HTTP Proxy',
      8443: 'HTTPS Alt',
      11434: 'Ollama',
      27017: 'MongoDB'
    };
    return knownPorts[port] || 'Unknown';
  }

  /**
   * Verifica se indirizzo è locale
   */
  isLocalAddress(address) {
    if (!address) return true;
    return (
      address === '127.0.0.1' ||
      address === '::1' ||
      address === 'localhost' ||
      address.startsWith('192.168.') ||
      address.startsWith('10.') ||
      address.startsWith('172.16.') ||
      address === '0.0.0.0' ||
      address === '::'
    );
  }

  /**
   * Suggerimento geografico base (semplificato)
   */
  getGeoHint(address) {
    // In una versione reale, si userebbe un servizio GeoIP
    // Qui diamo solo un hint base
    if (this.isLocalAddress(address)) return 'Local';
    return 'External';
  }

  /**
   * Genera sommario rete
   */
  generateSummary(connections, interfaces) {
    const activeInterfaces = interfaces.filter(i => i.operstate === 'up');
    const listeningPorts = connections.filter(c => 
      c.state === 'LISTEN' || c.state === 'LISTENING'
    );
    const established = connections.filter(c => c.state === 'ESTABLISHED');

    return {
      totalConnections: connections.length,
      activeInterfaces: activeInterfaces.length,
      listeningPorts: listeningPorts.length,
      establishedConnections: established.length,
      primaryInterface: activeInterfaces[0]?.name || 'N/A',
      primaryIp: activeInterfaces[0]?.ip4 || 'N/A'
    };
  }

  /**
   * Analizza rischi di sicurezza
   */
  analyzeSecurityRisks(connections) {
    const risks = [];
    const warnings = [];
    
    connections.forEach(conn => {
      // Porte potenzialmente pericolose aperte
      const dangerousPorts = [23, 21, 445, 3389, 5900]; // Telnet, FTP, SMB, RDP, VNC
      
      if ((conn.state === 'LISTEN' || conn.state === 'LISTENING') && 
          dangerousPorts.includes(conn.localPort)) {
        risks.push({
          type: 'dangerous_port',
          port: conn.localPort,
          service: this.identifyService(conn.localPort),
          process: conn.process,
          recommendation: `La porta ${conn.localPort} (${this.identifyService(conn.localPort)}) è aperta. Considera di chiuderla se non necessaria.`
        });
      }
      
      // Connessioni in uscita su porte insolite
      if (conn.state === 'ESTABLISHED' && 
          !this.isLocalAddress(conn.peerAddress) &&
          conn.peerPort && 
          ![80, 443, 53, 8080, 8443].includes(conn.peerPort)) {
        warnings.push({
          type: 'unusual_outbound',
          peerAddress: conn.peerAddress,
          peerPort: conn.peerPort,
          process: conn.process,
          note: `Connessione a porta non standard: ${conn.peerPort}`
        });
      }
    });

    return {
      riskLevel: risks.length > 0 ? 'elevated' : 'normal',
      risks,
      warnings,
      recommendations: this.generateSecurityRecommendations(risks)
    };
  }

  /**
   * Genera raccomandazioni di sicurezza
   */
  generateSecurityRecommendations(risks) {
    const recommendations = [];
    
    if (risks.some(r => r.port === 23)) {
      recommendations.push('Disabilita Telnet e usa SSH per accesso remoto sicuro');
    }
    if (risks.some(r => r.port === 21)) {
      recommendations.push('Considera SFTP o FTPS invece di FTP non criptato');
    }
    if (risks.some(r => r.port === 3389)) {
      recommendations.push('Proteggi RDP con VPN o Network Level Authentication');
    }
    if (risks.some(r => r.port === 445)) {
      recommendations.push('Assicurati che SMB sia protetto da firewall per reti non fidate');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Nessun rischio significativo rilevato');
    }
    
    return recommendations;
  }
}

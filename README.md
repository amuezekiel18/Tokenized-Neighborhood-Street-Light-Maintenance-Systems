# Tokenized Neighborhood Street Light Maintenance System

A decentralized system for managing neighborhood street light maintenance through blockchain technology, enabling transparent tracking, community participation, and efficient municipal coordination.

## System Overview

This system consists of five interconnected smart contracts that work together to manage street light maintenance:

### Core Contracts

1. **Outage Detection Contract** (`outage-detection.clar`)
    - Identifies non-functioning lights requiring repair
    - Tracks outage reports and status
    - Manages repair completion verification

2. **Energy Efficiency Contract** (`energy-efficiency.clar`)
    - Monitors power consumption patterns
    - Identifies LED upgrade opportunities
    - Tracks energy savings and efficiency metrics

3. **Safety Prioritization Contract** (`safety-prioritization.clar`)
    - Determines urgent lighting repair locations
    - Prioritizes repairs based on safety criteria
    - Manages emergency lighting situations

4. **Municipal Coordination Contract** (`municipal-coordination.clar`)
    - Manages communication with city maintenance departments
    - Coordinates repair schedules and resource allocation
    - Tracks municipal response times

5. **Community Reporting Contract** (`community-reporting.clar`)
    - Enables resident notification of lighting issues
    - Manages community feedback and reports
    - Incentivizes community participation through tokens

## Features

- **Decentralized Reporting**: Community members can report lighting issues directly
- **Transparent Tracking**: All maintenance activities are recorded on-chain
- **Priority Management**: Automatic prioritization based on safety and efficiency criteria
- **Municipal Integration**: Streamlined communication with city departments
- **Token Incentives**: Reward system for community participation
- **Energy Monitoring**: Track power consumption and efficiency improvements

## Contract Architecture

Each contract operates independently without cross-contract calls, ensuring:
- **Modularity**: Each contract handles specific functionality
- **Reliability**: No dependencies between contracts
- **Scalability**: Easy to upgrade individual components
- **Security**: Isolated contract logic reduces attack vectors

## Getting Started

### Prerequisites
- Clarity development environment
- Stacks blockchain testnet access
- Node.js for running tests

### Installation

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Run tests: \`npm test\`
4. Deploy contracts to testnet

### Usage

1. **Report an Outage**: Use the community reporting contract
2. **Track Repairs**: Monitor status through outage detection contract
3. **View Priorities**: Check safety prioritization for urgent repairs
4. **Municipal Updates**: City departments update repair status
5. **Energy Monitoring**: Track consumption and efficiency improvements

## Testing

The system includes comprehensive tests using Vitest:
- Unit tests for each contract function
- Integration tests for workflow scenarios
- Edge case testing for error handling

Run tests with: \`npm test\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details
